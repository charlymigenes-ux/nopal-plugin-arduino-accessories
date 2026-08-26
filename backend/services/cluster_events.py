"""Avisos que la placa MAESTRA del clúster le manda a NOPAL.

Las placas se descubren y eligen líder entre ellas por UDP, sin que NOPAL
participe (ver nopal_cluster.h). El problema es que NOPAL se enteraba de
esos cambios solo si alguien miraba: no hay scheduler de fondo para
plugins, y el evento que más importa -- una placa uniéndose al clúster --
pasa justo al encenderla, cuando típicamente no hay ningún navegador
abierto.

Por eso el sentido se invierte acá: en vez de que NOPAL sondee, la placa
maestra avisa. Al aceptar un JOIN le pega a POST
/api/accessories/cluster/event de este plugin, y NOPAL reacciona -- hoy,
anunciándolo en la Matriz LED.

AUTENTICACIÓN
-------------
Una placa no puede tener sesión de NOPAL (no hay navegador ni cookies), y
este endpoint tiene que funcionar sin usuario. Se usa un token compartido:
NOPAL lo genera solo la primera vez y el usuario lo copia al secrets.h de
cada placa. La comparación es con secrets.compare_digest para no filtrar
el token por el tiempo que tarda en fallar.

El token NO es un mecanismo de seguridad fuerte -- viaja en HTTP plano por
la LAN, igual que el resto del tráfico con las placas. Sirve para que un
dispositivo cualquiera de la red no pueda disparar anuncios en la matriz,
no para resistir a alguien que ya esté escuchando el cable.
"""

from __future__ import annotations

import json
import logging
import secrets
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

CONFIG_PATH = Path("data/accessories/cluster_events.json")

# Eventos que la placa maestra sabe mandar. Uno desconocido se rechaza en
# vez de ignorarse en silencio: si el firmware empieza a mandar algo que
# este NOPAL no entiende, es mejor verlo en la respuesta que perderlo.
VALID_EVENTS = ("join", "leave")

DEFAULTS: Dict[str, Any] = {
    "enabled": True,
    # Anuncio en la Matriz LED al unirse una placa. Se separa de "enabled"
    # porque el aviso puede servir para otras cosas (registro de
    # actividad) aunque no se quiera texto en la pantalla.
    "announce_join": True,
    "announce_leave": False,
    "announce_color": "00ff88",
    "token": "",
}


def _read() -> Dict[str, Any]:
    try:
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        data = {}
    if not isinstance(data, dict):
        data = {}
    return {**DEFAULTS, **data}


def _write(config: Dict[str, Any]) -> None:
    try:
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        CONFIG_PATH.write_text(json.dumps(config, indent=2), encoding="utf-8")
    except OSError as exc:
        logger.warning(f"No se pudo guardar la config de avisos del clúster: {exc}")


def get_config() -> Dict[str, Any]:
    """Config actual, generando el token la primera vez.

    Se genera acá y no en una migración porque no hay una: el plugin puede
    estrenarse en cualquier momento y el token tiene que existir antes de
    que el usuario lo copie al secrets.h de la primera placa.
    """
    config = _read()
    if not config.get("token"):
        config["token"] = secrets.token_hex(16)
        _write(config)
    return config


def public_config() -> Dict[str, Any]:
    """Config para la interfaz. Incluye el token a propósito: el usuario
    tiene que poder copiarlo al secrets.h de cada placa, así que esconderlo
    lo volvería inservible. El endpoint que la sirve sí exige sesión."""
    return get_config()


def update_config(payload: Dict[str, Any]) -> Dict[str, Any]:
    config = get_config()
    for key in ("enabled", "announce_join", "announce_leave"):
        if key in payload:
            config[key] = bool(payload[key])
    if "announce_color" in payload:
        color = str(payload["announce_color"]).strip().lstrip("#").lower()
        if len(color) != 6 or any(c not in "0123456789abcdef" for c in color):
            raise ValueError("El color debe ser hexadecimal de 6 dígitos (ej. 00ff88)")
        config["announce_color"] = color
    _write(config)
    return config


def rotate_token() -> Dict[str, Any]:
    """Token nuevo. Deja fuera a todas las placas hasta que se actualice su
    secrets.h -- es el precio de poder revocarlo si se filtró."""
    config = get_config()
    config["token"] = secrets.token_hex(16)
    _write(config)
    return config


def token_is_valid(candidate: Optional[str]) -> bool:
    if not candidate:
        return False
    return secrets.compare_digest(str(candidate), get_config()["token"])


def _board_label(address: Optional[str], mac: Optional[str]) -> str:
    """Nombre que el usuario le puso a la placa, buscándola por su IP en el
    registro. Si no está registrada se usa la IP, y si tampoco hay, la MAC:
    algo identificable siempre, aunque sea feo. Nunca una cadena vacía --
    un anuncio en blanco en la matriz no le dice nada a nadie."""
    if address:
        try:
            from . import board_pinmap_service

            for board in board_pinmap_service.list_boards():
                if board.get("ip") == address or board.get("device") == address:
                    name = str(board.get("name") or "").strip()
                    if name:
                        return name
        except Exception as exc:
            logger.debug(f"No se pudo resolver el nombre de la placa {address}: {exc}")
    return address or mac or "PLACA"


def _announce(text: str, color: str) -> bool:
    """Manda el texto a la Matriz LED, que es OTRO plugin. Se alcanza por el
    cargador del core, igual que hace la capa de IA -- no por un import
    directo, que ataría este plugin a que el otro esté instalado. Si no
    está, el aviso simplemente no se muestra y el evento igual se registra."""
    try:
        from backend.services.plugin_loader_service import get_loaded_plugin_module
    except ImportError:
        logger.debug("El cargador de plugins del core no está disponible")
        return False

    screen = get_loaded_plugin_module("matriz-led", "services.screen_service")
    if screen is None:
        logger.info("Matriz LED no instalada o no cargada: no se anuncia el evento de clúster")
        return False

    try:
        screen.send_text(text, color=color)
        return True
    except Exception as exc:
        # Que falle la pantalla no debe hacer fallar el aviso de la placa:
        # el maestro no tiene nada que hacer con ese error y reintentar solo
        # lo dejaría bloqueado en el POST.
        logger.warning(f"No se pudo anunciar en la Matriz LED: {exc}")
        return False


def handle_event(event: str, mac: Optional[str], address: Optional[str]) -> Dict[str, Any]:
    """Procesa un aviso de la placa maestra. Devuelve qué se hizo, para que
    el firmware lo pueda ver en la respuesta al depurar."""
    event = str(event or "").strip().lower()
    if event not in VALID_EVENTS:
        raise ValueError(f"Evento desconocido: {event}")

    config = get_config()
    label = _board_label(address, mac)

    if not config.get("enabled"):
        return {"handled": False, "reason": "avisos_desactivados", "board": label}

    quiere_anuncio = config.get("announce_join") if event == "join" else config.get("announce_leave")
    announced = False
    if quiere_anuncio:
        texto = f"{label} EN LINEA" if event == "join" else f"{label} FUERA"
        announced = _announce(texto, config.get("announce_color", "00ff88"))

    try:
        from .activity_log import log_event

        log_event(
            accessory_id="",
            name=label,
            action=f"cluster_{event}",
            detail={"mac": mac, "address": address},
        )
    except Exception as exc:
        logger.debug(f"No se pudo registrar el evento de clúster en la bitácora: {exc}")

    return {"handled": True, "board": label, "event": event, "announced": announced}

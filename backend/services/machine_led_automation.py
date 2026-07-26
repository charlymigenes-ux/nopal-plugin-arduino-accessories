"""Alertas visuales por máquina para tiras LED del plugin.

El core de NOPAL solo informa cambios de estado. La selección del hardware,
el reparto de píxeles y la ejecución pertenecen al plugin, de modo que al
desinstalarlo no queda una dependencia rota dentro del control de impresoras.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional

from . import accessory_service
from .activity_log import log_event

CONFIG_PATH = Path("data/accessories/machine_led_rules.json")
MACHINE_TYPES = {"klipper", "marlin", "elegoo", "flashforge", "bambu", "laser", "cnc"}
VISUAL_STATES = ("idle", "heating", "cooling", "printing", "paused", "completed", "error", "offline")
DEFAULT_COLORS = {
    "idle": [0, 24, 8],
    "heating": [255, 96, 0],
    "cooling": [40, 36, 30],
    "printing": [0, 160, 64],
    "paused": [255, 180, 0],
    "completed": [0, 110, 255],
    "error": [255, 0, 24],
    "offline": [0, 0, 0],
}

# Bandas fijas del "termómetro" de calentando/enfriando -- de fría a
# caliente. El firmware (protocolo WSSEG) solo acepta un color parejo por
# tramo, no un color por pixel, así que el degradado se simula repartiendo
# estas 4 bandas entre los LEDs del segmento y prendiendo solo las primeras
# `filled` según el progreso (0-100). Ver _heat_gradient_runs().
HEAT_GRADIENT_STOPS = [
    (40, 36, 30),     # blanco muy tenue
    (255, 200, 0),    # amarillo
    (255, 120, 0),    # naranja
    (255, 0, 0),      # rojo -- a temperatura objetivo
]

_lock = Lock()
_last_applied_state: Dict[str, Any] = {}


def _heat_gradient_runs(count: int, progress: int) -> List[Dict[str, Any]]:
    """Reparte `count` LEDs en las 4 bandas de HEAT_GRADIENT_STOPS y enciende
    solo las primeras `filled` (según `progress`, 0-100) -- imita una barra
    de termómetro que se va llenando y calentando de tono a medida que sube
    la temperatura (o se vacía y enfría al revés). Los LEDs sin encender
    quedan apagados. Devuelve tramos contiguos del mismo color (no un color
    por LED) para minimizar comandos WSSEG."""
    if count <= 0:
        return []
    progress = max(0, min(100, progress))
    filled = round(count * progress / 100)
    band_size = count / 4
    colors = []
    for i in range(count):
        if i >= filled:
            colors.append((0, 0, 0))
            continue
        band = min(3, int(i // band_size))
        colors.append(HEAT_GRADIENT_STOPS[band])
    runs = []
    start = 0
    for i in range(1, count + 1):
        if i == count or colors[i] != colors[start]:
            runs.append({"start": start, "count": i - start, "color": colors[start]})
            start = i
    return runs


def _read() -> List[Dict[str, Any]]:
    try:
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def _write(entries: List[Dict[str, Any]]) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = CONFIG_PATH.with_suffix(".tmp")
    temporary.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(CONFIG_PATH)


def machine_key(machine_type: str, machine_id: str) -> str:
    return f"{machine_type}:{machine_id}"


def get_led_targets() -> List[Dict[str, Any]]:
    targets = []
    for accessory in accessory_service.get_accessories():
        config = accessory.get("config") or {}
        if accessory.get("driver") != "arduino" or not config.get("led_mode"):
            continue
        # El protocolo/cantidad guardados pertenecen al momento del alta.
        # Tras una OTA a protocolo 4 no obligamos al usuario a eliminar y
        # volver a registrar la tira: /api/status es público y de solo
        # lectura, así que refrescamos esas dos capacidades al abrir el
        # configurador de escenas.
        live = None
        if config.get("transport") == "wifi" and config.get("ip"):
            live = accessory_service.probe_wifi_board(str(config["ip"]), "", "")
        count = int(
            (live or {}).get("ws2812_count")
            or config.get("led_count")
            or config.get("ws2812_count")
            or 0
        )
        protocol = int((live or {}).get("protocol") or config.get("protocol") or 0)
        targets.append({
            "id": accessory["id"],
            "name": accessory.get("name") or accessory["id"],
            "mode": config.get("led_mode"),
            "led_count": count,
            "protocol": protocol,
            "segment_capable": bool(config.get("segment_capable") or protocol >= 4),
            # Tiras registradas antes de que existiera este checkbox no tienen
            # la clave todavía -- default True para no apagarles silenciosamente
            # una réplica que antes no existía y que nadie pidió desactivar.
            "show_on_panel": bool(config.get("show_on_panel", True)),
        })
    return targets


def get_config(machine_type: str, machine_id: str) -> Optional[Dict[str, Any]]:
    key = machine_key(machine_type, machine_id)
    return next((entry for entry in _read() if entry.get("key") == key), None)


def list_enabled_by_key() -> Dict[str, bool]:
    """Mapa {machine_key: enabled} de todas las máquinas configuradas -- para
    pintar el ícono de ajustes LED de cada tarjeta (gris/verde) sin tener que
    pedir la config completa de cada una por separado."""
    return {entry["key"]: bool(entry.get("enabled")) for entry in _read()}


def get_config_payload(machine_type: str, machine_id: str) -> Dict[str, Any]:
    return {
        "machine_type": machine_type,
        "machine_id": machine_id,
        "config": get_config(machine_type, machine_id),
        "targets": get_led_targets(),
        "states": list(VISUAL_STATES),
        "default_colors": DEFAULT_COLORS,
    }


def _validate_color(value: Any) -> List[int]:
    if not isinstance(value, list) or len(value) != 3:
        raise ValueError("Cada estado necesita un color RGB")
    color = [int(channel) for channel in value]
    if any(channel < 0 or channel > 255 for channel in color):
        raise ValueError("Los canales RGB deben estar entre 0 y 255")
    return color


async def save_config(
    machine_type: str,
    machine_id: str,
    machine_name: str,
    enabled: bool,
    accessory_id: str,
    start: int,
    count: int,
    colors: Dict[str, Any],
) -> Dict[str, Any]:
    if machine_type not in MACHINE_TYPES:
        raise ValueError("Tipo de máquina desconocido")
    if not machine_id:
        raise ValueError("Falta el identificador de la máquina")
    target = next((item for item in get_led_targets() if item["id"] == accessory_id), None)
    if target is None:
        raise ValueError("La tira LED seleccionada ya no está registrada")
    start, count = int(start), int(count)
    led_count = int(target.get("led_count") or 0)
    if start < 0 or count < 1:
        raise ValueError("El segmento LED no es válido")
    if led_count and start + count > led_count:
        raise ValueError("El segmento rebasa la cantidad de LEDs de la tira")
    uses_segment = start > 0 or (led_count and count < led_count)
    if uses_segment and not target.get("segment_capable"):
        raise ValueError("Esta placa necesita firmware con protocolo 4 para controlar segmentos")

    normalized_colors = {
        state: _validate_color(colors.get(state, DEFAULT_COLORS[state]))
        for state in VISUAL_STATES
    }
    key = machine_key(machine_type, machine_id)
    old_entry = get_config(machine_type, machine_id)
    entry = {
        "key": key,
        "machine_type": machine_type,
        "machine_id": machine_id,
        "machine_name": machine_name or machine_id,
        "enabled": bool(enabled),
        "accessory_id": accessory_id,
        "start": start,
        "count": count,
        "colors": normalized_colors,
        "updated_at": time.time(),
    }
    with _lock:
        entries = [item for item in _read() if item.get("key") != key]
        entries.append(entry)
        _write(entries)
    _last_applied_state.pop(key, None)

    # Apagar la tira es responsabilidad de esta función, no de apply_state:
    # mientras la ayuda está deshabilitada, apply_state ni se ejecuta (sale
    # en el chequeo de "enabled" antes de tocar hardware), así que nadie más
    # apaga los LEDs que quedaron prendidos con el último color aplicado.
    if old_entry and old_entry.get("enabled") and (
        old_entry.get("accessory_id") != accessory_id
        or old_entry.get("start") != start
        or old_entry.get("count") != count
    ):
        await accessory_service.set_accessory_led_segment(
            old_entry["accessory_id"], old_entry["start"], old_entry["count"], 0, 0, 0
        )
    if not enabled:
        await accessory_service.set_accessory_led_segment(accessory_id, start, count, 0, 0, 0)

    return entry


async def apply_state(
    machine_type: str, machine_id: str, state: str, progress: Optional[int] = None
) -> Dict[str, Any]:
    config = get_config(machine_type, machine_id)
    if config is None or not config.get("enabled"):
        return {"applied": False, "reason": "not_configured", "show_on_panel": False, "runs": []}
    state = state if state in VISUAL_STATES else "idle"
    key = machine_key(machine_type, machine_id)
    use_gradient = state in ("heating", "cooling") and progress is not None

    if use_gradient:
        runs = _heat_gradient_runs(config["count"], progress)
        # Para heating/cooling con progreso, el "estado ya aplicado" no
        # alcanza para deduplicar -- el progreso sigue cambiando aunque el
        # estado no cambie. Se deduplica contra la cantidad de LEDs
        # prendidos (lo único que de verdad se ve distinto), no contra el
        # % crudo.
        filled = round(config["count"] * max(0, min(100, progress)) / 100)
        dedup_value: Any = (state, filled)
    else:
        color = config["colors"].get(state, DEFAULT_COLORS[state])
        runs = [{"start": 0, "count": config["count"], "color": color}] if config["count"] > 0 else []
        dedup_value = state

    # Lectura directa del registro (sin pasar por get_led_targets(), que hace
    # un sondeo de red en vivo para refrescar protocolo/cantidad de LEDs) --
    # "mostrar en panel" es una preferencia guardada en NOPAL, nunca depende
    # del hardware, así que no vale la pena esa latencia extra en cada
    # actualización de estado (esto corre en cada ciclo de polling).
    accessory_config = accessory_service.get_accessory_connection(config["accessory_id"]) or {}
    render_info = {"runs": runs, "show_on_panel": bool(accessory_config.get("show_on_panel", True))}

    # El panel necesita esta info (para dibujar la réplica en la tarjeta)
    # incluso cuando el estado no cambió y no hay nada nuevo que escribirle
    # al hardware -- por eso se devuelve siempre, deduplicación aparte.
    if _last_applied_state.get(key) == dedup_value:
        return {"applied": False, "reason": "unchanged", **render_info}

    result = True
    for run in runs:
        run_ok = await accessory_service.set_accessory_led_segment(
            config["accessory_id"], config["start"] + run["start"], run["count"], *run["color"]
        )
        result = result and bool(run_ok)
    detail = {"machine": key, "state": state, "progress": progress, "runs": len(runs)}

    if result:
        _last_applied_state[key] = dedup_value
        log_event(config["accessory_id"], config.get("machine_name", machine_id), "machine_led_state", detail)
    return {"applied": bool(result), "reason": None if result else "hardware_error", **render_info}

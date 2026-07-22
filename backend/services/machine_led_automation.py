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
VISUAL_STATES = ("idle", "heating", "printing", "paused", "completed", "error", "offline")
DEFAULT_COLORS = {
    "idle": [0, 24, 8],
    "heating": [255, 96, 0],
    "printing": [0, 160, 64],
    "paused": [255, 180, 0],
    "completed": [0, 110, 255],
    "error": [255, 0, 24],
    "offline": [0, 0, 0],
}

_lock = Lock()
_last_applied_state: Dict[str, str] = {}


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
        })
    return targets


def get_config(machine_type: str, machine_id: str) -> Optional[Dict[str, Any]]:
    key = machine_key(machine_type, machine_id)
    return next((entry for entry in _read() if entry.get("key") == key), None)


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


def save_config(
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
    return entry


async def apply_state(machine_type: str, machine_id: str, state: str) -> Dict[str, Any]:
    config = get_config(machine_type, machine_id)
    if config is None or not config.get("enabled"):
        return {"applied": False, "reason": "not_configured"}
    state = state if state in VISUAL_STATES else "idle"
    key = machine_key(machine_type, machine_id)
    if _last_applied_state.get(key) == state:
        return {"applied": False, "reason": "unchanged"}
    color = config["colors"].get(state, DEFAULT_COLORS[state])
    result = await accessory_service.set_accessory_led_segment(
        config["accessory_id"], config["start"], config["count"], *color
    )
    if result:
        _last_applied_state[key] = state
        log_event(
            config["accessory_id"],
            config.get("machine_name", machine_id),
            "machine_led_state",
            {"machine": key, "state": state, "start": config["start"], "count": config["count"], "color": color},
        )
    return {"applied": bool(result), "reason": None if result else "hardware_error"}

"""Persistencia real del mapa de pines de "Automatización de Taller":
placas que el usuario agregó (por catálogo o adoptadas por el asistente de
firmware) y la función/parámetros que le asignó a cada pin. Es
documentación/planificación real -- el firmware (nopal_accessory.ino,
nopal_tcall_sim800l.ino) sigue teniendo roles de pin fijos de fábrica, esto
no lo reconfigura. A propósito en un archivo separado de
accessory_registry.json, que es el registro de hardware realmente
detectado/controlado por accessory_service.py."""

import json
import time
from typing import Any, Dict, List, Optional

BOARDS_CONFIG_PATH = "arduino_boards_config.json"


def _load_boards() -> List[Dict[str, Any]]:
    try:
        with open(BOARDS_CONFIG_PATH, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError):
        return []


def _save_boards(boards: List[Dict[str, Any]]) -> None:
    try:
        with open(BOARDS_CONFIG_PATH, "w", encoding="utf-8") as handle:
            json.dump(boards, handle, indent=2)
    except OSError:
        pass


def list_boards() -> List[Dict[str, Any]]:
    return _load_boards()


def add_board(
    catalog_id: str,
    name: str,
    pins: Dict[str, List[Dict[str, Any]]],
    device: Optional[str] = None,
    ip: Optional[str] = None,
) -> Dict[str, Any]:
    boards = _load_boards()
    board = {
        "id": f"board_{int(time.time() * 1000)}",
        "catalog_id": catalog_id,
        "name": name,
        "pins": pins,
        "device": device,
        "ip": ip,
        "created_at": time.time(),
    }
    boards.append(board)
    _save_boards(boards)
    return board


def update_board_pin(
    board_id: str,
    side: str,
    index: int,
    category: str,
    common: Dict[str, Any],
    params: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    boards = _load_boards()
    board = next((b for b in boards if b.get("id") == board_id), None)
    if board is None:
        return None
    pins = (board.get("pins") or {}).get(side)
    if not isinstance(pins, list) or not 0 <= index < len(pins):
        return None
    pins[index]["category"] = category
    pins[index]["common"] = common
    pins[index]["params"] = params
    _save_boards(boards)
    return board


def update_board_info(
    board_id: str,
    name: Optional[str] = None,
    device: Optional[str] = None,
    ip: Optional[str] = None,
    catalog_id: Optional[str] = None,
    pins: Optional[Dict[str, List[Dict[str, Any]]]] = None,
) -> Optional[Dict[str, Any]]:
    """Edita nombre/puerto USB/IP de una placa ya agregada -- no toca sus
    pines. Cada campo es opcional para poder editar uno solo sin pisar los
    otros dos (ej. renombrar sin tocar la IP)."""
    boards = _load_boards()
    board = next((b for b in boards if b.get("id") == board_id), None)
    if board is None:
        return None
    if name is not None:
        board["name"] = name
    if device is not None:
        board["device"] = device or None
    if ip is not None:
        board["ip"] = ip or None
    if catalog_id is not None:
        board["catalog_id"] = catalog_id
    if pins is not None:
        board["pins"] = pins
    _save_boards(boards)
    return board


def get_ambient_sensor_board_id() -> Optional[str]:
    """Placa que el usuario eligió como "sensor ambiente del taller" (ver
    set_ambient_sensor_board) -- None si no eligió ninguna. Se guarda en la
    propia placa (campo "ambient_sensor") en vez de en un archivo aparte,
    para no sumar un tercer registro además de arduino_boards_config.json
    y accessory_registry.json."""
    board = next((b for b in _load_boards() if b.get("ambient_sensor")), None)
    return board.get("id") if board else None


def set_ambient_sensor_board(board_id: Optional[str]) -> bool:
    """Marca `board_id` como el sensor ambiente del taller (a lo sumo una
    placa a la vez -- elegir una nueva desmarca la anterior). board_id=None
    quita la selección. Devuelve False si se pidió una placa que no existe
    -- no se inventa una selección."""
    boards = _load_boards()
    if board_id is not None and not any(b.get("id") == board_id for b in boards):
        return False
    for board in boards:
        board["ambient_sensor"] = board.get("id") == board_id
    _save_boards(boards)
    return True


def remove_board(board_id: str) -> bool:
    boards = _load_boards()
    remaining = [b for b in boards if b.get("id") != board_id]
    if len(remaining) == len(boards):
        return False
    _save_boards(remaining)
    return True

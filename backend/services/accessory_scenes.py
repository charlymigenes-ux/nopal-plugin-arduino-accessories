"""Macros y escenas de accesorios.

Un preset con nombre que aplica varias acciones (encender/apagar un
accesorio, o fijar el color de una tira LED) sobre accesorios YA
registrados, de un solo golpe. Persistido en JSON, mismo patrón atómico
que accessory_registry.json y activity_log.py — nada de esto ejecuta
código arbitrario, solo reutiliza accessory_service contra drivers reales.

Tres modos:
- "normal" (default, compatible con toda escena creada antes de esto):
  una sola lista de acciones, siempre la misma cada vez que se ejecuta.
- "toggle": dos "estados" con nombre (ej. "Encendido"/"Apagado"), cada uno
  con su propia lista de acciones -- cada ejecución aplica el estado
  siguiente y se acuerda cuál quedó activo, como un interruptor real.
- "cycle": igual que "toggle" pero con 3 o más estados, en secuencia.

El estado "actual" (qué se aplicó la última vez) se guarda en el propio
JSON de la escena (current_variant_index/current_state_name), NO en el
cliente -- dos personas o dos pestañas apretando el mismo botón tienen que
ver la misma secuencia. `actions` sigue reflejando SIEMPRE la lista que
esta escena aplicaría ahora mismo (para no romper a nadie que ya lee
scene.actions/scene.actions.length, dentro o fuera de este plugin).
"""

from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional

from . import accessory_service
from .activity_log import log_event

SCENES_PATH = Path("data/accessories/scenes.json")
_lock = Lock()

_MODES = ("normal", "toggle", "cycle")


def _read() -> List[Dict[str, Any]]:
    try:
        payload = json.loads(SCENES_PATH.read_text(encoding="utf-8"))
        return payload if isinstance(payload, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def _write(scenes: List[Dict[str, Any]]) -> None:
    SCENES_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = SCENES_PATH.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(scenes, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temporary.replace(SCENES_PATH)


def get_scenes() -> List[Dict[str, Any]]:
    return _read()


def _validate_actions(actions: List[Dict[str, Any]]) -> None:
    if not actions:
        raise ValueError("La escena necesita al menos una acción")
    for action in actions:
        if not action.get("accessory_id"):
            raise ValueError("Cada acción necesita un accessory_id")
        if "color" not in action and "on" not in action:
            raise ValueError("Cada acción necesita 'on' o 'color'")


def _validate_variants(variants: List[Dict[str, Any]]) -> None:
    if not variants or len(variants) < 2:
        raise ValueError("El modo doble/múltiple necesita al menos 2 estados")
    for variant in variants:
        if not variant.get("name"):
            raise ValueError("Cada estado necesita un nombre")
        _validate_actions(variant.get("actions") or [])


def _build_scene_fields(mode: str, actions: Optional[List[Dict[str, Any]]], variants: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
    mode = mode if mode in _MODES else "normal"
    if mode == "normal":
        _validate_actions(actions or [])
        return {
            "mode": "normal",
            "actions": actions,
            "variants": None,
            "current_variant_index": None,
            "current_state_name": None,
        }
    _validate_variants(variants or [])
    return {
        "mode": mode,
        "actions": variants[0]["actions"],
        "variants": variants,
        "current_variant_index": 0,
        "current_state_name": variants[0].get("name"),
    }


def create_scene(name: str, mode: str = "normal", actions: Optional[List[Dict[str, Any]]] = None, variants: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """actions (modo normal): lista de {"accessory_id", "on"} o
    {"accessory_id", "color": [r, g, b]}. variants (modo toggle/cycle):
    lista de {"name", "actions": [...]} -- 2 para toggle, 2+ para cycle."""
    if not name:
        raise ValueError("La escena necesita un nombre")
    fields = _build_scene_fields(mode, actions, variants)

    with _lock:
        scenes = _read()
        scene = {
            "id": uuid.uuid4().hex[:12],
            "name": name,
            "created_at": time.time(),
            **fields,
        }
        scenes.append(scene)
        _write(scenes)
    return scene


def update_scene(scene_id: str, name: str, mode: str = "normal", actions: Optional[List[Dict[str, Any]]] = None, variants: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """Igual que create_scene pero sobre una escena ya existente -- conserva
    id y created_at. Si cambia el modo o las acciones, el estado actual se
    reinicia al primer estado (no hay forma honesta de saber a cuál de los
    estados nuevos correspondería el estado viejo)."""
    if not name:
        raise ValueError("La escena necesita un nombre")
    fields = _build_scene_fields(mode, actions, variants)

    with _lock:
        scenes = _read()
        scene = next((s for s in scenes if s.get("id") == scene_id), None)
        if scene is None:
            raise KeyError(scene_id)
        scene["name"] = name
        scene.update(fields)
        _write(scenes)
    return scene


def delete_scene(scene_id: str) -> bool:
    with _lock:
        scenes = _read()
        filtered = [s for s in scenes if s.get("id") != scene_id]
        changed = len(filtered) != len(scenes)
        if changed:
            _write(filtered)
    return changed


async def run_scene(scene_id: str) -> Optional[bool]:
    # El siguiente estado a aplicar (y su persistencia) se calcula con el
    # lock tomado, sincrónico -- las acciones de hardware (I/O real, con
    # await) se disparan DESPUÉS de soltarlo, nunca mientras se sostiene un
    # Lock de threading.
    with _lock:
        scenes = _read()
        scene = next((s for s in scenes if s.get("id") == scene_id), None)
        if scene is None:
            return None
        mode = scene.get("mode", "normal")
        if mode == "normal":
            to_apply = scene.get("actions") or []
        else:
            variants = scene.get("variants") or []
            if not variants:
                to_apply = []
            else:
                next_index = ((scene.get("current_variant_index") or 0) + 1) % len(variants)
                to_apply = variants[next_index].get("actions") or []
                scene["current_variant_index"] = next_index
                scene["actions"] = to_apply
                scene["current_state_name"] = variants[next_index].get("name")
                _write(scenes)
        scene_name = scene["name"]
        scene_actions_count = len(scene.get("actions") or [])

    ok = True
    for action in to_apply:
        accessory_id = action.get("accessory_id")
        if not accessory_id:
            continue
        if "color" in action:
            red, green, blue = action["color"]
            result = await accessory_service.set_accessory_led_color(accessory_id, red, green, blue)
        else:
            result = await accessory_service.set_accessory_power(accessory_id, bool(action.get("on")))
        ok = ok and bool(result)

    log_event(f"scene:{scene_id}", scene_name, "scene_run", {"actions": scene_actions_count})
    return ok

import asyncio
import json
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse

from backend.auth_deps import require_auth, require_role
from .services import accessory_scenes, cluster_events, machine_led_automation
from .services.accessory_service import (
    discover_arduino_boards,
    get_accessory_connection,
    get_configured_boards_telemetry,
    get_accessories,
    get_accessories_status,
    get_driver_names,
    list_usb_arduino_ports,
    probe_wifi_board,
    register_accessory,
    rename_accessory,
    set_accessory_led_color,
    set_accessory_power,
    unregister_accessory,
)
from .services import board_pinmap_service
from .services.activity_log import get_recent as get_recent_activity
from .services.firmware_flash_service import (
    flash_via_ota,
    flash_via_usb,
    list_builds,
    resolve_build_path,
    resolve_ino_source_path,
    save_build,
)

router = APIRouter()


@router.get("/api/accessories/drivers")
async def accessory_drivers_endpoint(user: dict = Depends(require_auth)):
    """Drivers disponibles (ej. 'home_assistant', 'http_relay') — para poblar
    el formulario de registro sin hardcodear la lista en el frontend."""
    return {"drivers": get_driver_names()}


@router.get("/api/accessories/arduino/discover")
async def accessory_arduino_discover_endpoint(user: dict = Depends(require_role("admin"))):
    """Escanea los puertos USB en busca de placas ESP32 con el firmware
    NOPAL (firmware/nopal_accessory/) — para cada una que contesta, el
    puerto que tomó y el modelo/capacidades que declaró (relés, tira PWM,
    WS2812), para poblar el formulario de alta sin que el usuario tenga que
    adivinar nada."""
    return {"boards": await discover_arduino_boards()}


@router.get("/api/accessories/arduino/list-ports")
async def accessory_arduino_list_ports_endpoint(user: dict = Depends(require_role("admin"))):
    """Puertos USB candidatos SIN exigir que ya respondan el handshake NOPAL
    (a diferencia de /discover) -- para el asistente de primer uso, donde la
    placa puede estar totalmente en blanco (sin firmware NOPAL todavía) y
    por lo tanto no contesta NOPAL:ID?, pero igual hay que poder ofrecerla
    como destino para flashear."""
    return {"ports": list_usb_arduino_ports()}


@router.post("/api/accessories/arduino/probe-wifi")
async def accessory_arduino_probe_wifi_endpoint(
    ip: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    user: dict = Depends(require_role("admin")),
):
    """Prueba una placa NOPAL por IP antes de darla de alta por WiFi (mismas
    credenciales OTA que ya usa el flasheo por WiFi) — mismo propósito que
    el descubrimiento USB, pero para una placa que no está conectada acá
    por cable."""
    board = await asyncio.get_event_loop().run_in_executor(None, probe_wifi_board, ip, username, password)
    if board is None:
        raise HTTPException(status_code=400, detail="No se encontró una placa NOPAL en esa IP con esas credenciales")
    return board


@router.get("/api/accessories/arduino/boards")
async def arduino_boards_list_endpoint(user: dict = Depends(require_auth)):
    """Placas agregadas a mano (catálogo + apodo) o adoptadas por el
    asistente de firmware, con la función/parámetros que el usuario le
    asignó a cada pin -- documentación/planificación real del mapa de
    pines, ver board_pinmap_service.py. No cambia el comportamiento del
    firmware, que sigue con roles de pin fijos de fábrica."""
    return {"boards": board_pinmap_service.list_boards()}


@router.get("/api/accessories/arduino/telemetry")
async def arduino_boards_telemetry_endpoint(user: dict = Depends(require_auth)):
    """Estado real de las placas configuradas, por USB o WiFi.

    Mantiene separado el mapa de pines persistido de la lectura que puede
    fallar temporalmente cuando una placa está apagada.
    """
    boards = board_pinmap_service.list_boards()
    return {"boards": await get_configured_boards_telemetry(boards)}


@router.get("/api/accessories/arduino/ambient-sensor")
async def arduino_ambient_sensor_get_endpoint(user: dict = Depends(require_auth)):
    """Qué placa (si hay alguna) está marcada como sensor ambiente del
    taller -- ver board_pinmap_service.get_ambient_sensor_board_id(). Lo
    consulta tanto el frontend de este plugin (para marcar el toggle
    correcto) como dashboard_service.py del core, por get_loaded_plugin_module."""
    return {"board_id": board_pinmap_service.get_ambient_sensor_board_id()}


@router.post("/api/accessories/arduino/ambient-sensor")
async def arduino_ambient_sensor_set_endpoint(
    board_id: str = Form(""),
    user: dict = Depends(require_role("admin")),
):
    """`board_id` vacío quita la selección (ninguna placa es el sensor
    ambiente). Devuelve 404 si se pidió una placa que no existe, en vez de
    guardar una selección que después nunca va a responder."""
    if not board_pinmap_service.set_ambient_sensor_board(board_id or None):
        raise HTTPException(status_code=404, detail="No se encontró esa placa")
    return {"board_id": board_pinmap_service.get_ambient_sensor_board_id()}


@router.post("/api/accessories/arduino/boards")
async def arduino_boards_add_endpoint(
    catalog_id: str = Form(...),
    name: str = Form(...),
    pins: str = Form(...),
    device: str = Form(""),
    ip: str = Form(""),
    user: dict = Depends(require_role("admin")),
):
    """`pins` es el JSON {"left": [...], "right": [...]} tal cual lo arma
    el catálogo del frontend -- el backend no interpreta su forma, solo la
    persiste."""
    try:
        pins_data = json.loads(pins)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="El campo 'pins' no es un JSON válido")
    return board_pinmap_service.add_board(catalog_id, name, pins_data, device or None, ip or None)


@router.put("/api/accessories/arduino/boards/{board_id}/pins/{side}/{index}")
async def arduino_boards_update_pin_endpoint(
    board_id: str,
    side: str,
    index: int,
    category: str = Form(...),
    common: str = Form("{}"),
    params: str = Form("{}"),
    user: dict = Depends(require_role("admin")),
):
    if side not in ("left", "right"):
        raise HTTPException(status_code=400, detail="'side' debe ser 'left' o 'right'")
    try:
        common_data = json.loads(common)
        params_data = json.loads(params)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="'common' o 'params' no es un JSON válido")
    board = board_pinmap_service.update_board_pin(board_id, side, index, category, common_data, params_data)
    if board is None:
        raise HTTPException(status_code=404, detail="Placa o pin no encontrado")
    return board


@router.put("/api/accessories/arduino/boards/{board_id}")
async def arduino_boards_update_info_endpoint(
    board_id: str,
    name: Optional[str] = Form(None),
    device: Optional[str] = Form(None),
    ip: Optional[str] = Form(None),
    catalog_id: Optional[str] = Form(None),
    pins: Optional[str] = Form(None),
    user: dict = Depends(require_role("admin")),
):
    """Edita nombre/puerto USB/IP de una placa ya agregada -- ver
    board_pinmap_service.update_board_info. No toca sus pines."""
    pins_data = None
    if pins is not None:
        try:
            pins_data = json.loads(pins)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="'pins' no es un JSON válido")
    board = board_pinmap_service.update_board_info(
        board_id, name, device, ip, catalog_id, pins_data
    )
    if board is None:
        raise HTTPException(status_code=404, detail="Placa no encontrada")
    return board


@router.delete("/api/accessories/arduino/boards/{board_id}")
async def arduino_boards_remove_endpoint(board_id: str, user: dict = Depends(require_role("admin"))):
    if not board_pinmap_service.remove_board(board_id):
        raise HTTPException(status_code=404, detail="Placa no encontrada")
    return {"success": True}


@router.get("/api/accessories")
async def accessory_list_endpoint(user: dict = Depends(require_auth)):
    """Accesorios IoT registrados (extractores, ventiladores, bombas, etc.)."""
    return {"accessories": get_accessories()}


@router.get("/api/accessories/status")
async def accessory_status_endpoint(user: dict = Depends(require_auth)):
    """Igual que /api/accessories pero con el estado on/off en vivo de cada
    uno (probeo real contra el driver) — endpoint aparte porque ese probeo
    tiene costo y no todas las pantallas lo necesitan."""
    return {"accessories": await get_accessories_status()}


@router.post("/api/accessories")
async def accessory_register_endpoint(
    name: str = Form(...),
    kind: str = Form("other"),
    driver: str = Form(...),
    config: str = Form(...),
    user: dict = Depends(require_role("admin")),
):
    """Registra un accesorio nuevo. `config` es un JSON con los campos que
    pida el driver elegido (ej. para 'home_assistant': base_url, token,
    entity_id; para 'http_relay': on_url, off_url, y opcionalmente
    status_url/status_on_text)."""
    try:
        config_dict = json.loads(config)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="El campo 'config' no es un JSON válido")

    try:
        entry = register_accessory(name, kind, driver, config_dict)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return entry


@router.post("/api/accessories/arduino/lighting")
async def accessory_arduino_lighting_endpoint(
    name: str = Form(...),
    transport: str = Form(...),
    device: str = Form(""),
    ip: str = Form(""),
    username: str = Form(""),
    password: str = Form(""),
    mode: str = Form("ws2812"),
    gpio: int = Form(...),
    count: int = Form(1),
    protocol: int = Form(0),
    show_on_panel: bool = Form(True),
    user: dict = Depends(require_role("admin")),
):
    """Alta directa de una luz conectada a una placa NOPAL existente.

    Sigue usando el driver Arduino real, pero evita obligar al usuario a
    construir JSON dentro de la pantalla genérica de accesorios.
    """
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Ponle un nombre a la iluminación")
    if transport not in {"usb", "wifi"}:
        raise HTTPException(status_code=400, detail="Transporte inválido")
    if transport == "wifi" and not ip.strip():
        raise HTTPException(status_code=400, detail="Selecciona una placa con IP")
    if transport == "usb" and not device.strip():
        raise HTTPException(status_code=400, detail="Selecciona una placa USB")
    if mode not in {"ws2812", "pwm"}:
        raise HTTPException(status_code=400, detail="Tipo de iluminación inválido")
    if gpio < 0 or gpio > 48:
        raise HTTPException(status_code=400, detail="GPIO fuera de rango")
    if count < 1 or count > 2048:
        raise HTTPException(status_code=400, detail="La cantidad debe estar entre 1 y 2048 LEDs")
    config = {
        "transport": transport,
        "led_mode": mode,
        "gpio": gpio,
        "led_count": count,
        "ws2812_count": count if mode == "ws2812" else 0,
        "protocol": protocol,
        "show_on_panel": show_on_panel,
    }
    if transport == "wifi":
        config.update({"ip": ip.strip(), "ota_username": username, "ota_password": password})
    else:
        config["device"] = device.strip()
    return register_accessory(name, "led_strip", "arduino", config)


@router.post("/api/accessories/arduino/relay")
async def accessory_arduino_relay_endpoint(
    name: str = Form(...),
    transport: str = Form(...),
    device: str = Form(""),
    ip: str = Form(""),
    username: str = Form(""),
    password: str = Form(""),
    relay: int = Form(...),
    user: dict = Depends(require_role("admin")),
):
    """Alta directa de un relé de una placa NOPAL existente -- misma idea que
    /api/accessories/arduino/lighting: la placa ya reportó cuántos relés
    tiene (ver /api/status), así que solo falta ponerle nombre en vez de
    mandar al usuario a construir un accesorio desde cero en la pantalla
    genérica."""
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Ponle un nombre al relé")
    if transport not in {"usb", "wifi"}:
        raise HTTPException(status_code=400, detail="Transporte inválido")
    if transport == "wifi" and not ip.strip():
        raise HTTPException(status_code=400, detail="Selecciona una placa con IP")
    if transport == "usb" and not device.strip():
        raise HTTPException(status_code=400, detail="Selecciona una placa USB")
    if relay < 1 or relay > 16:
        raise HTTPException(status_code=400, detail="Número de relé fuera de rango")
    config = {"transport": transport, "relay": relay}
    if transport == "wifi":
        config.update({"ip": ip.strip(), "ota_username": username, "ota_password": password})
    else:
        config["device"] = device.strip()
    return register_accessory(name, "relay", "arduino", config)


@router.post("/api/accessories/remove")
async def accessory_remove_endpoint(id: str = Form(...), user: dict = Depends(require_role("admin"))):
    if not unregister_accessory(id):
        raise HTTPException(status_code=404, detail="Accesorio no encontrado")
    return {"success": True}


@router.post("/api/accessories/power")
async def accessory_power_endpoint(id: str = Form(...), on: bool = Form(...), user: dict = Depends(require_auth)):
    result = await set_accessory_power(id, on)
    if result is None:
        raise HTTPException(status_code=404, detail="Accesorio no encontrado")
    if not result:
        raise HTTPException(status_code=502, detail="No se pudo cambiar el estado del accesorio")
    return {"success": True}


@router.post("/api/accessories/led")
async def accessory_led_endpoint(
    id: str = Form(...),
    r: int = Form(...),
    g: int = Form(...),
    b: int = Form(...),
    user: dict = Depends(require_auth),
):
    """Fija el color de una tira LED (PWM o WS2812) conectada a una placa
    NOPAL. Solo aplica a accesorios cuyo driver soporte 'set_color' (hoy,
    únicamente 'arduino')."""
    for value in (r, g, b):
        if not 0 <= value <= 255:
            raise HTTPException(status_code=400, detail="Los valores RGB deben estar entre 0 y 255")
    result = await set_accessory_led_color(id, r, g, b)
    if result is None:
        raise HTTPException(status_code=404, detail="Accesorio no encontrado o sin soporte de color")
    if not result:
        raise HTTPException(status_code=502, detail="No se pudo cambiar el color")
    return {"success": True}


@router.get("/api/accessories/machine-led/enabled")
async def machine_led_enabled_endpoint(user: dict = Depends(require_auth)):
    """Estado habilitado/deshabilitado de todas las máquinas configuradas,
    para pintar el ícono de ajustes LED en cada tarjeta sin abrir el modal."""
    return {"enabled": machine_led_automation.list_enabled_by_key()}


@router.get("/api/accessories/machine-led/config")
async def machine_led_config_endpoint(
    machine_type: str,
    machine_id: str,
    user: dict = Depends(require_auth),
):
    """Configuración de alertas visuales de una máquina y destinos LED reales."""
    if machine_type not in machine_led_automation.MACHINE_TYPES or not machine_id:
        raise HTTPException(status_code=400, detail="Máquina no válida")
    return machine_led_automation.get_config_payload(machine_type, machine_id)


@router.post("/api/accessories/machine-led/config")
async def machine_led_save_config_endpoint(
    machine_type: str = Form(...),
    machine_id: str = Form(...),
    machine_name: str = Form(""),
    enabled: bool = Form(False),
    accessory_id: str = Form(...),
    start: int = Form(0),
    count: int = Form(...),
    colors: str = Form(...),
    user: dict = Depends(require_role("admin")),
):
    try:
        colors_data = json.loads(colors)
        if not isinstance(colors_data, dict):
            raise ValueError("Los colores no tienen el formato esperado")
        return await machine_led_automation.save_config(
            machine_type, machine_id, machine_name, enabled,
            accessory_id, start, count, colors_data,
        )
    except (json.JSONDecodeError, ValueError) as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.post("/api/accessories/machine-led/state")
async def machine_led_state_endpoint(
    machine_type: str = Form(...),
    machine_id: str = Form(...),
    state: str = Form(...),
    progress: Optional[int] = Form(None),
    user: dict = Depends(require_auth),
):
    if machine_type not in machine_led_automation.MACHINE_TYPES or not machine_id:
        raise HTTPException(status_code=400, detail="Máquina no válida")
    return await machine_led_automation.apply_state(machine_type, machine_id, state, progress)


@router.post("/api/accessories/rename")
async def accessory_rename_endpoint(
    id: str = Form(...),
    name: str = Form(...),
    user: dict = Depends(require_role("admin")),
):
    entry = rename_accessory(id, name)
    if entry is None:
        raise HTTPException(status_code=404, detail="Accesorio no encontrado")
    return entry


@router.get("/api/accessories/activity")
async def accessory_activity_endpoint(user: dict = Depends(require_auth)):
    """Historial reciente de eventos reales (encendidos, apagados, cambios
    de color, altas/bajas de accesorios, escenas ejecutadas) — ver
    activity_log.py. Vacío si todavía no pasó nada."""
    return {"activity": get_recent_activity(30)}


@router.get("/api/accessories/scenes")
async def accessory_scenes_list_endpoint(user: dict = Depends(require_auth)):
    return {"scenes": accessory_scenes.get_scenes()}


def _parse_scene_payload(actions: Optional[str], variants: Optional[str]):
    """`actions` (modo normal): JSON, lista de {"accessory_id", "on"} o
    {"accessory_id", "color": [r, g, b]}. `variants` (modo toggle/cycle):
    JSON, lista de {"name", "actions": [...]}. Solo uno de los dos aplica
    según `mode` -- accessory_scenes valida cuál hace falta."""
    actions_list = None
    if actions:
        try:
            actions_list = json.loads(actions)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="El campo 'actions' no es un JSON válido")
    variants_list = None
    if variants:
        try:
            variants_list = json.loads(variants)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="El campo 'variants' no es un JSON válido")
    return actions_list, variants_list


@router.post("/api/accessories/scenes")
async def accessory_scenes_create_endpoint(
    name: str = Form(...),
    mode: str = Form("normal"),
    actions: Optional[str] = Form(None),
    variants: Optional[str] = Form(None),
    user: dict = Depends(require_role("admin")),
):
    actions_list, variants_list = _parse_scene_payload(actions, variants)
    try:
        scene = accessory_scenes.create_scene(name, mode=mode, actions=actions_list, variants=variants_list)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return scene


@router.put("/api/accessories/scenes/{scene_id}")
async def accessory_scenes_update_endpoint(
    scene_id: str,
    name: str = Form(...),
    mode: str = Form("normal"),
    actions: Optional[str] = Form(None),
    variants: Optional[str] = Form(None),
    user: dict = Depends(require_role("admin")),
):
    """Igual que el POST de creación pero sobre una escena existente."""
    actions_list, variants_list = _parse_scene_payload(actions, variants)
    try:
        scene = accessory_scenes.update_scene(scene_id, name, mode=mode, actions=actions_list, variants=variants_list)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except KeyError:
        raise HTTPException(status_code=404, detail="Escena no encontrada")
    return scene


@router.delete("/api/accessories/scenes/{scene_id}")
async def accessory_scenes_delete_endpoint(scene_id: str, user: dict = Depends(require_role("admin"))):
    if not accessory_scenes.delete_scene(scene_id):
        raise HTTPException(status_code=404, detail="Escena no encontrada")
    return {"success": True}


@router.post("/api/accessories/scenes/{scene_id}/run")
async def accessory_scenes_run_endpoint(scene_id: str, user: dict = Depends(require_auth)):
    result = await accessory_scenes.run_scene(scene_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Escena no encontrada")
    return {"success": result}


# ── Flasheo de firmware ──
#
# NOPAL nunca compila nada (no hay arduino-cli/platformio en el servidor):
# estos endpoints administran binarios .bin YA COMPILADOS que el usuario
# sube (Arduino IDE -> Sketch -> Export Compiled Binary) y los escriben en
# una placa real, por USB (esptool) o por red (ElegantOTA). Ver
# backend/services/firmware_flash_service.py.

@router.get("/api/accessories/firmware/builds")
async def accessory_firmware_builds_endpoint(user: dict = Depends(require_auth)):
    """Binarios .bin ya subidos y disponibles para flashear."""
    return {"builds": list_builds()}


@router.get("/api/accessories/firmware/builds/{filename}/download")
async def accessory_firmware_download_endpoint(filename: str, user: dict = Depends(require_auth)):
    """Descarga un binario .bin ya subido -- para quien prefiera subirlo a
    mano desde el panel OTA de la propia placa (http://<ip>/update) en vez
    de dejar que NOPAL lo haga."""
    try:
        bin_path = resolve_build_path(filename)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=404, detail=str(e))
    return FileResponse(bin_path, filename=bin_path.name, media_type="application/octet-stream")


@router.get("/api/accessories/firmware/source")
async def accessory_firmware_source_endpoint(user: dict = Depends(require_auth)):
    """Descarga el .ino fuente del firmware actual del accesorio."""
    try:
        ino_path = resolve_ino_source_path()
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return FileResponse(ino_path, filename=ino_path.name, media_type="text/x-arduino")


@router.post("/api/accessories/firmware/upload")
async def accessory_firmware_upload_endpoint(
    file: UploadFile = File(...),
    user: dict = Depends(require_role("admin")),
):
    """Sube un binario .bin ya compilado (Export Compiled Binary) al
    servidor, para poder flashearlo después por USB u OTA."""
    if not file.filename or not file.filename.lower().endswith(".bin"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un binario .bin")

    content = await file.read()

    try:
        build = save_build(file.filename, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"success": True, "build": build}


@router.post("/api/accessories/firmware/flash-usb")
async def accessory_firmware_flash_usb_endpoint(
    device: str = Form(...),
    filename: str = Form(...),
    user: dict = Depends(require_role("admin")),
):
    """Flashea `filename` (ya subido, ver /firmware/upload) en la placa
    conectada en `device` (ej. /dev/ttyUSB1) usando esptool, offset 0x0.
    Suelta cualquier conexión serie del driver 'arduino' sobre ese puerto
    antes de tocarlo — esptool necesita control exclusivo del puerto."""
    try:
        bin_path = resolve_build_path(filename)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, flash_via_usb, device, str(bin_path))

    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error") or "Fallo al flashear por USB")

    return result


@router.post("/api/accessories/firmware/flash-ota")
async def accessory_firmware_flash_ota_endpoint(
    ip: str = Form(...),
    filename: str = Form(...),
    username: str = Form(""),
    password: str = Form(""),
    user: dict = Depends(require_role("admin")),
):
    """Flashea `filename` (ya subido) por red, contra el ElegantOTA que
    corre en la placa en `ip` (firmware 1.3+, Wi-Fi ya conectado).
    username/password son las credenciales de ElegantOTA configuradas en
    secrets.h de esa placa (vacías si esa placa no tiene autenticación)."""
    try:
        bin_path = resolve_build_path(filename)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, flash_via_ota, ip, str(bin_path), username, password)

    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error") or "Fallo al flashear por OTA")

    return result


@router.get("/api/accessories/{accessory_id}/firmware-status")
async def accessory_firmware_status_endpoint(accessory_id: str, user: dict = Depends(require_auth)):
    """Prueba la placa de un accesorio WiFi con sus credenciales YA
    guardadas y devuelve modelo/firmware/protocolo actuales -- el paso
    "Buscando… / Conectado" del flujo de actualización automática."""
    config = get_accessory_connection(accessory_id)
    if not config:
        raise HTTPException(status_code=404, detail="Accesorio no encontrado")
    ip = config.get("ip")
    if not ip:
        raise HTTPException(status_code=400, detail="Este accesorio no está conectado por WiFi")
    info = probe_wifi_board(ip, config.get("ota_username", ""), config.get("ota_password", ""))
    if info is None:
        raise HTTPException(status_code=502, detail="No se pudo contactar la placa")
    return info


@router.post("/api/accessories/firmware/flash-ota-for/{accessory_id}")
async def accessory_firmware_flash_ota_for_endpoint(
    accessory_id: str,
    filename: str = Form(""),
    user: dict = Depends(require_role("admin")),
):
    """Igual que /firmware/flash-ota, pero usando la IP y credenciales OTA
    YA guardadas del accesorio en vez de pedírselas de nuevo al usuario --
    el botón "que NOPAL lo haga por ti". Sin `filename`, usa el binario más
    reciente entre los ya subidos."""
    config = get_accessory_connection(accessory_id)
    if not config:
        raise HTTPException(status_code=404, detail="Accesorio no encontrado")
    ip = config.get("ip")
    if not ip:
        raise HTTPException(status_code=400, detail="Este accesorio no está conectado por WiFi")

    if filename:
        try:
            bin_path = resolve_build_path(filename)
        except (ValueError, FileNotFoundError) as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        builds = list_builds()
        if not builds:
            raise HTTPException(status_code=404, detail="No hay ningún binario de firmware subido todavía")
        bin_path = resolve_build_path(builds[0]["filename"])

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, flash_via_ota, ip, str(bin_path), config.get("ota_username", ""), config.get("ota_password", "")
    )
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error") or "Fallo al flashear por OTA")
    return result


# ── Avisos del clúster de placas ──
#
# Ver el docstring de services/cluster_events.py: acá NOPAL no sondea, la
# placa maestra avisa. Es el único endpoint de este plugin SIN sesión --
# quien llama es un ESP32, que no tiene cookies ni usuario.

@router.post("/api/accessories/cluster/event")
async def cluster_event_endpoint(
    event: str = Form(...),
    mac: str = Form(""),
    address: str = Form(""),
    x_nopal_token: Optional[str] = Header(None),
):
    """Aviso de la placa maestra: una placa entró (o salió) del clúster.

    Sin `require_auth` a propósito -- lo llama el firmware, no un
    navegador. Va autenticado con el token compartido en la cabecera
    X-NOPAL-Token (ver cluster_events.token_is_valid).

    Los errores del lado de la pantalla NO se propagan: al firmware solo le
    importa saber si el aviso se recibió, y un 500 acá lo dejaría
    reintentando un anuncio que nunca va a funcionar.
    """
    if not cluster_events.token_is_valid(x_nopal_token):
        raise HTTPException(status_code=401, detail="Token de clúster inválido")

    try:
        return await asyncio.to_thread(
            cluster_events.handle_event, event, mac or None, address or None
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/accessories/cluster/config")
async def cluster_config_get_endpoint(user: dict = Depends(require_auth)):
    """Config de los avisos, token incluido: el usuario lo necesita para
    copiarlo al secrets.h de cada placa."""
    return cluster_events.public_config()


@router.post("/api/accessories/cluster/config")
async def cluster_config_set_endpoint(
    payload: dict,
    user: dict = Depends(require_role("admin")),
):
    try:
        return cluster_events.update_config(payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/accessories/cluster/config/rotate-token")
async def cluster_rotate_token_endpoint(user: dict = Depends(require_role("admin"))):
    """Token nuevo. Deja fuera a todas las placas hasta que se actualice su
    secrets.h -- es intencional, es lo que lo hace revocable."""
    return cluster_events.rotate_token()

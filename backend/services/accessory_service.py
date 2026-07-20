import asyncio
import json
import logging
import threading
import time
import uuid
from typing import Any, Dict, List, Optional

import requests

from .activity_log import log_event

logger = logging.getLogger(__name__)

REGISTRY_PATH = "accessory_registry.json"
HTTP_TIMEOUT = 5
NOPAL_BOARD_BAUD = 115200


# ── Drivers ──
#
# Cada accesorio IoT (extractor, ventilador, bomba, compresor...) habla uno
# de estos protocolos. "tasmota" es el recomendado por defecto para el
# usuario final: 100% local (sin depender de una nube ni de tener Home
# Assistant instalado), firmware maduro y barato de conseguir (enchufes tipo
# Sonoff flasheados), y confirma el estado real del relé en la respuesta en
# vez de asumir que si el HTTP no dio error el equipo obedeció.
# "home_assistant" es el de mayor alcance para quien YA tiene HA corriendo:
# en vez de escribir un driver por marca, delega en su API REST, que integra
# Tasmota, Shelly, Tuya, Zigbee, ESPHome, etc.
# "http_relay" es el genérico de respaldo: cualquier placa que prenda/apague
# pegándole a una URL propia, para equipos que no hablan el API de Tasmota.

def _tasmota_command(config: Dict[str, Any], action: str = "") -> str:
    base = f"Power{config['relay']}" if config.get("relay") else "Power"
    return f"{base} {action}".strip()


def _tasmota_power_key(config: Dict[str, Any]) -> str:
    return f"POWER{config['relay']}" if config.get("relay") else "POWER"


def _tasmota_request(config: Dict[str, Any], action: str = "") -> Optional[dict]:
    params = {"cmnd": _tasmota_command(config, action)}
    if config.get("username"):
        params["user"] = config["username"]
        params["password"] = config.get("password", "")
    try:
        response = requests.get(f"http://{config['host']}/cm", params=params, timeout=HTTP_TIMEOUT)
        response.raise_for_status()
        return response.json()
    except (requests.exceptions.RequestException, ValueError) as e:
        logger.debug(f"[{config.get('host')}] Tasmota sin respuesta: {e}")
        return None


def _tasmota_get_state(config: Dict[str, Any]) -> Optional[bool]:
    data = _tasmota_request(config)
    if data is None:
        return None
    return {"ON": True, "OFF": False}.get(data.get(_tasmota_power_key(config)))


def _tasmota_set_state(config: Dict[str, Any], on: bool) -> bool:
    # Se confirma contra el valor que Tasmota devuelve en la misma respuesta
    # (no solo que el HTTP no dio error) — un enchufe atascado o que rechazó
    # el comando responde 200 igual, pero con el estado sin cambiar.
    data = _tasmota_request(config, "On" if on else "Off")
    if data is None:
        return False
    return data.get(_tasmota_power_key(config)) == ("ON" if on else "OFF")


def _ha_get_state(config: Dict[str, Any]) -> Optional[bool]:
    try:
        response = requests.get(
            f"{config['base_url'].rstrip('/')}/api/states/{config['entity_id']}",
            headers={"Authorization": f"Bearer {config['token']}"},
            timeout=HTTP_TIMEOUT,
        )
        response.raise_for_status()
        state = response.json().get("state")
        return {"on": True, "off": False}.get(state)
    except (requests.exceptions.RequestException, ValueError) as e:
        logger.debug(f"[{config.get('entity_id')}] No se pudo leer estado (Home Assistant): {e}")
        return None


def _ha_set_state(config: Dict[str, Any], on: bool) -> bool:
    domain = config["entity_id"].split(".")[0]
    service = "turn_on" if on else "turn_off"
    try:
        response = requests.post(
            f"{config['base_url'].rstrip('/')}/api/services/{domain}/{service}",
            headers={
                "Authorization": f"Bearer {config['token']}",
                "Content-Type": "application/json",
            },
            json={"entity_id": config["entity_id"]},
            timeout=HTTP_TIMEOUT,
        )
        return response.ok
    except requests.exceptions.RequestException as e:
        logger.warning(f"[{config.get('entity_id')}] Fallo al cambiar estado (Home Assistant): {e}")
        return False


def _relay_get_state(config: Dict[str, Any]) -> Optional[bool]:
    status_url = config.get("status_url")
    on_text = config.get("status_on_text")
    if not status_url or not on_text:
        return None
    try:
        response = requests.get(status_url, timeout=HTTP_TIMEOUT)
        response.raise_for_status()
        return on_text in response.text
    except requests.exceptions.RequestException as e:
        logger.debug(f"[{status_url}] No se pudo leer estado (relé HTTP): {e}")
        return None


def _relay_set_state(config: Dict[str, Any], on: bool) -> bool:
    url = config.get("on_url") if on else config.get("off_url")
    if not url:
        return False
    try:
        response = requests.get(url, timeout=HTTP_TIMEOUT)
        return response.ok
    except requests.exceptions.RequestException as e:
        logger.warning(f"[{url}] Fallo al cambiar estado (relé HTTP): {e}")
        return False


# "arduino" habla con una placa ESP32 propia corriendo el firmware de este
# proyecto (firmware/nopal_accessory/nopal_accessory.ino) por USB-serie, para
# quien arma su propio relé/tira LED con una placa de unos pesos en vez de
# comprar un enchufe Tasmota. Cada accesorio registrado controla UN relé de
# la placa (config["relay"], 1-indexado); una misma placa con 4 relés se da
# de alta como 4 accesorios separados que comparten "device"/"location" (ver
# discover_arduino_boards() más abajo para encontrar esos valores). La
# conexión serie se mantiene abierta entre comandos (_arduino_connections)
# para no pagar el margen de arranque de 2s del ESP32 en cada toggle.

_arduino_connections: Dict[str, Any] = {}

# Un lock por puerto físico -- TODO el tráfico serie hacia el mismo device
# (comandos de encendido/apagado y lecturas de estado a través de la
# conexión persistente, y el handshake NOPAL:ID? del descubrimiento) tiene
# que pasar por acá antes de escribir/leer nada. Sin esto, el escaneo de
# descubrimiento (que el frontend dispara en cada refreshAll(), incluido
# justo después de todo power toggle -- ver arduino-accessories.js,
# togglePower()) puede abrir una segunda conexión cruda al mismo puerto
# MIENTRAS la conexión persistente está a mitad de un comando. Confirmado
# contra una placa real durante el debug de este bug: un probeo de
# descubrimiento concurrente (su propio serial.Serial() sobre el mismo
# device) se quedó con una respuesta "ON" que en realidad era la
# contestación pendiente de OTRA consulta de estado en curso por la
# conexión persistente -- dos lectores compitiendo por los mismos bytes que
# llegan de la placa, cada uno se queda con lo que alcanza a leer primero,
# sin ninguna garantía de que sea la respuesta a SU propio comando. Eso deja
# a ambos lados con respuestas cruzadas o truncadas: el que pidió
# "R1:ON" puede no recibir nunca su "OK" (aunque el firmware sí haya
# ejecutado el comando), y viceversa -- exactamente el síntoma reportado
# ("el badge cambia pero el relé no responde" es la cara visible de un
# "OK"/estado que en realidad le llegó a otro lector, o de un comando que le
# llegó al firmware entreverado con el de otro escritor concurrente).
_arduino_locks: Dict[str, threading.Lock] = {}
_arduino_locks_guard = threading.Lock()


def _get_arduino_lock(device: str) -> threading.Lock:
    with _arduino_locks_guard:
        lock = _arduino_locks.get(device)
        if lock is None:
            lock = threading.Lock()
            _arduino_locks[device] = lock
        return lock


def _resolve_arduino_device(config: Dict[str, Any]) -> Optional[str]:
    """Ubicación física primero (estable entre reinicios/replugs, mismo
    criterio que laser_service/marlin_printer_service), 'device' como
    respaldo si no hay ubicación registrada o la placa no está conectada ahí
    ahora mismo."""
    location = config.get("location")
    if location:
        from backend.services.laser_service import _resolve_usb_location
        resolved = _resolve_usb_location(location)
        if resolved:
            return resolved
    return config.get("device")


def _open_arduino_connection(device: str):
    import serial
    ser = _arduino_connections.get(device)
    if ser is not None:
        if ser.is_open:
            return ser
        _arduino_connections.pop(device, None)
    ser = serial.Serial(device, NOPAL_BOARD_BAUD, timeout=1.0)
    # Margen de arranque del ESP32 (toggle de DTR al abrir el puerto) — se
    # paga una sola vez por conexión, no en cada comando.
    time.sleep(2)
    ser.reset_input_buffer()
    _arduino_connections[device] = ser
    return ser


def _arduino_send_command(config: Dict[str, Any], command: str) -> Optional[str]:
    device = _resolve_arduino_device(config)
    if not device:
        return None
    # Todo el intercambio (abrir/reusar la conexión, limpiar el buffer,
    # escribir, leer la respuesta) queda protegido por el lock del puerto --
    # ver _get_arduino_lock. Si se soltara el lock entre pasos, un probeo de
    # descubrimiento concurrente podría colarse justo entre el write() y el
    # readline() y quedarse con la respuesta que le corresponde a este
    # comando.
    with _get_arduino_lock(device):
        try:
            ser = _open_arduino_connection(device)
            ser.reset_input_buffer()
            ser.write(f"{command}\n".encode("utf-8"))
            raw = ser.readline()
        except Exception as e:
            logger.warning(f"[{device}] Fallo al hablar con la placa NOPAL: {e}")
            old = _arduino_connections.pop(device, None)
            if old is not None:
                try:
                    old.close()
                except Exception:
                    pass
            return None
    return raw.decode("utf-8", errors="ignore").strip() or None


def _arduino_http_request(
    config: Dict[str, Any], method: str, path: str, params: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """Igual que _arduino_send_command pero para accesorios registrados con
    config["transport"] == "wifi" -- pega directo a los endpoints
    /api/relay y /api/led del firmware (mismo protocolo de texto que ya
    habla Serial, ver nopal_accessory.ino: setupWebServer()), protegidos
    con las mismas credenciales OTA que NOPAL ya le pide al usuario al dar
    de alta un accesorio por WiFi (config["ota_username"]/["ota_password"]
    -- no es una credencial nueva). Se devuelve el cuerpo de la respuesta
    tal cual venga (sea "OK" o un "ERR:..."), igual criterio que el
    transporte serie: quien llama decide qué significa la respuesta."""
    ip = config.get("ip")
    if not ip:
        return None
    try:
        response = requests.request(
            method,
            f"http://{ip}{path}",
            params=params,
            auth=(config.get("ota_username", ""), config.get("ota_password", "")),
            timeout=HTTP_TIMEOUT,
        )
        return response.text.strip() or None
    except requests.exceptions.RequestException as e:
        logger.warning(f"[{ip}] Fallo al hablar con la placa NOPAL por WiFi: {e}")
        return None


def probe_wifi_board(ip: str, username: str, password: str) -> Optional[Dict[str, Any]]:
    """Prueba una placa NOPAL por WiFi antes de darla de alta: pega a su
    GET /api/status (el mismo endpoint que ya usa el flasheo por OTA) y
    arma la misma forma de capacidades que ya devuelve
    _probe_nopal_board_sync() para placas por USB, así el frontend puede
    reusar el mismo render sin importar el transporte. None si no
    contesta o no es una placa NOPAL real -- nunca se inventa un dato."""
    try:
        response = requests.get(
            f"http://{ip}/api/status",
            auth=(username, password),
            timeout=HTTP_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.exceptions.RequestException, ValueError) as e:
        logger.debug(f"[{ip}] No se pudo probar la placa NOPAL por WiFi: {e}")
        return None

    if data.get("role") != "accessory":
        return None

    io = data.get("io", {})
    wifi = data.get("wifi", {})
    return {
        "ip": ip,
        "firmware": data.get("firmware", ""),
        "hostname": data.get("hostname", ""),
        "relays": io.get("relays", 0),
        "pwm_led": bool(io.get("pwm_led")),
        "ws2812": bool(io.get("ws2812")),
        "ws2812_count": io.get("ws2812_count", 0),
        "wifi_connected": bool(wifi.get("connected")),
    }


def release_arduino_connection(device: str) -> None:
    """Cierra y descarta la conexión serie persistente sobre `device` si hay
    una abierta (_arduino_connections). Usado por firmware_flash_service
    antes de invocar esptool: éste necesita control exclusivo del puerto
    para flashear, así que hay que soltarlo antes — y no se debe volver a
    abrir hasta que el flasheo termine (nadie más llama a
    _open_arduino_connection mientras tanto). Toma el mismo lock que
    _arduino_send_command/_probe_nopal_board_sync para no cerrar la conexión
    a mitad de un comando en curso."""
    with _get_arduino_lock(device):
        ser = _arduino_connections.pop(device, None)
        if ser is not None:
            try:
                ser.close()
            except Exception:
                pass


def _arduino_get_state(config: Dict[str, Any]) -> Optional[bool]:
    if "relay" not in config:
        # Accesorio de tira LED: el firmware no tiene comando de lectura de
        # color (NOPAL:LED?/WS? no existen), así que no hay forma de
        # probear el estado en vivo. Se devuelve el último valor que se
        # confirmó con éxito (persistido en el registro por
        # _persist_led_state), no un dato inventado.
        return config.get("led_on")
    relay = config.get("relay", 1)
    if config.get("transport") == "wifi":
        response = _arduino_http_request(config, "GET", "/api/relay", {"n": relay})
    else:
        response = _arduino_send_command(config, f"NOPAL:R{relay}?")
    if response is None:
        return None
    return {"ON": True, "OFF": False}.get(response)


def _arduino_set_state(config: Dict[str, Any], on: bool) -> bool:
    relay = config.get("relay", 1)
    if config.get("transport") == "wifi":
        response = _arduino_http_request(
            config, "POST", "/api/relay", {"n": relay, "on": "true" if on else "false"}
        )
    else:
        action = "ON" if on else "OFF"
        response = _arduino_send_command(config, f"NOPAL:R{relay}:{action}")
    return response == "OK"


def _arduino_set_led(config: Dict[str, Any], red: int, green: int, blue: int) -> bool:
    """Capacidad adicional del driver "arduino", no parte de la interfaz
    compartida get_state/set_state (que sigue siendo booleana para los
    demás drivers). config["led_mode"] decide si la placa maneja una tira
    PWM analógica ("pwm", comando NOPAL:LED) o WS2812 ("ws2812", comando
    NOPAL:WS) — ver capacidades declaradas por discover_arduino_boards().
    config["transport"] decide, por separado, si el comando viaja por
    serie o por WiFi (ver _arduino_http_request)."""
    is_pwm = config.get("led_mode") == "pwm"
    if config.get("transport") == "wifi":
        response = _arduino_http_request(
            config, "POST", "/api/led",
            {"mode": "pwm" if is_pwm else "ws2812", "r": red, "g": green, "b": blue},
        )
    else:
        prefix = "LED" if is_pwm else "WS"
        response = _arduino_send_command(config, f"NOPAL:{prefix}:{red},{green},{blue}")
    return response == "OK"


DRIVERS: Dict[str, Dict[str, Any]] = {
    "tasmota": {
        "required": ("host",),
        "get_state": _tasmota_get_state,
        "set_state": _tasmota_set_state,
    },
    "home_assistant": {
        "required": ("base_url", "token", "entity_id"),
        "get_state": _ha_get_state,
        "set_state": _ha_set_state,
    },
    "http_relay": {
        "required": ("on_url", "off_url"),
        "get_state": _relay_get_state,
        "set_state": _relay_set_state,
    },
    "arduino": {
        # "relay" no está en required: los accesorios de tira LED
        # (kind="led_strip") no lo llevan, solo "led_mode". Los de relé
        # siempre lo mandan porque el formulario de alta lo exige.
        # "required" es una función acá (no una tupla fija como el resto de
        # los drivers) porque lo que hace falta depende de
        # config["transport"]: "device" para USB, "ip" para WiFi -- ver
        # register_accessory(), que soporta ambas formas.
        "required": lambda config: ("ip",) if config.get("transport") == "wifi" else ("device",),
        "get_state": _arduino_get_state,
        "set_state": _arduino_set_state,
        "set_color": _arduino_set_led,
    },
}


def get_driver_names() -> List[str]:
    return list(DRIVERS.keys())


# ── Descubrimiento de placas Arduino/ESP32 (firmware NOPAL) ──
#
# El driver "arduino" habla con una placa ESP32 que corre
# firmware/nopal_accessory/nopal_accessory.ino por USB-serie. Antes de poder
# controlar nada hay que encontrar en qué puerto está esa placa y qué
# capacidades declaró (cuántos relés, si tiene tira PWM y/o WS2812) — eso es
# lo que hace este bloque, siguiendo el mismo patrón de
# list_usb_laser_ports()/list_usb_marlin_ports() en los otros servicios de
# serie: filtrar por chips USB conocidos, excluir lo ya reclamado por otro
# servicio, y para lo que queda, un handshake liviano que abre y cierra su
# propia conexión.


def _parse_nopal_identification(line: str) -> Optional[Dict[str, Any]]:
    """Parsea la línea que manda sendIdentification() en el firmware, ej.
    'NOPAL,role=accessory,chip=ESP32-D0WD-V3,fw=1.3,relays=4,pwm_led=1,
    ws2812=1,ws2812_count=30,uptime_ms=12345,free_heap=203000,wifi=1,
    wifi_connected=1,wifi_mode=sta,hostname=nopal-accessory,ip=192.168.1.50,
    ota=1,ota_path=/update'. None si la línea no viene de una placa NOPAL
    (puede ser ruido de arranque, u otro firmware que no es el nuestro).
    Todos los campos agregados después de la 1.0 (uptime_ms/free_heap desde
    1.2, wifi*/hostname/ip/ota* desde 1.3) son opcionales con default
    seguro — una placa con firmware viejo simplemente no los manda y no
    debe romper el parseo. El frontend debe tratar uptime_ms/free_heap en 0
    como "no reportado", no como un valor real."""
    if not line.startswith("NOPAL,"):
        return None
    fields: Dict[str, str] = {}
    for part in line.split(",")[1:]:
        if "=" not in part:
            continue
        key, value = part.split("=", 1)
        fields[key] = value
    if fields.get("role") != "accessory":
        return None
    try:
        return {
            "chip": fields.get("chip", ""),
            "firmware": fields.get("fw", ""),
            "relays": int(fields.get("relays", 0)),
            "pwm_led": fields.get("pwm_led") == "1",
            "ws2812": fields.get("ws2812") == "1",
            "ws2812_count": int(fields.get("ws2812_count", 0)),
            "uptime_ms": int(fields.get("uptime_ms", 0)),
            "free_heap": int(fields.get("free_heap", 0)),
            "wifi": fields.get("wifi") == "1",
            "wifi_connected": fields.get("wifi_connected") == "1",
            "wifi_mode": fields.get("wifi_mode", ""),
            "hostname": fields.get("hostname", ""),
            "ip": fields.get("ip", ""),
            "ota": fields.get("ota") == "1",
            "ota_path": fields.get("ota_path", ""),
        }
    except ValueError:
        return None


def _read_nopal_identification(ser, timeout: float) -> Optional[Dict[str, Any]]:
    """Manda NOPAL:ID? por una conexión ya abierta (persistente o recién
    creada) y espera la línea de identificación hasta `timeout`. Extraído de
    _probe_nopal_board_sync para poder reusarlo tanto sobre una conexión
    persistente como sobre una temporal (ver ahí el porqué)."""
    try:
        ser.reset_input_buffer()
        request_sent_at = time.monotonic()
        ser.write(b"NOPAL:ID?\n")
    except Exception:
        return None
    end_time = time.monotonic() + timeout
    while time.monotonic() < end_time:
        try:
            raw = ser.readline()
        except Exception:
            return None
        if not raw:
            continue
        parsed = _parse_nopal_identification(raw.decode("utf-8", errors="ignore").strip())
        if parsed:
            parsed["latency_ms"] = round((time.monotonic() - request_sent_at) * 1000)
            return parsed
    return None


def _probe_nopal_board_sync(device: str, baud: int = NOPAL_BOARD_BAUD, timeout: float = 2.5) -> Optional[Dict[str, Any]]:
    """Handshake NOPAL:ID? contra `device`, protegido por el mismo lock por
    puerto que usa _arduino_send_command (ver _get_arduino_lock) -- este
    probeo se dispara en cada refreshAll() del frontend, incluido justo
    después de todo power toggle, así que NO puede competir por los mismos
    bytes con un comando en curso por la conexión persistente.

    Si ya hay una conexión persistente abierta sobre este puerto
    (_arduino_connections, ej. porque ya hay un accesorio registrado ahí),
    se reutiliza esa misma conexión en vez de abrir una segunda: evita pagar
    de nuevo el margen de arranque de 2s (la placa ya está lista hace rato)
    y, sobre todo, evita que dos objetos serial.Serial() distintos lean del
    mismo puerto físico a la vez -- confirmado contra hardware real durante
    el debug de este bug: dos lectores concurrentes sobre el mismo /dev
    terminan robándose respuestas entre sí (uno se queda con la
    contestación que en realidad esperaba el otro), dejando ambos lados con
    datos cruzados o comandos que nunca llegan a confirmarse aunque la
    placa sí los haya ejecutado.

    Si no hay conexión persistente todavía (primer probeo antes de
    registrar el accesorio), se abre una temporal con el margen de arranque
    de siempre, se usa y se cierra -- igual que antes, pero ahora bajo el
    lock del puerto para que nadie más pueda abrir otra en simultáneo."""
    with _get_arduino_lock(device):
        existing = _arduino_connections.get(device)
        if existing is not None:
            if not existing.is_open:
                _arduino_connections.pop(device, None)
                existing = None
        if existing is not None:
            try:
                return _read_nopal_identification(existing, timeout)
            except Exception as e:
                logger.warning(f"[{device}] Fallo al probear por la conexión persistente: {e}")
                old = _arduino_connections.pop(device, None)
                if old is not None:
                    try:
                        old.close()
                    except Exception:
                        pass
                # Sigue abajo e intenta con una conexión temporal nueva.

        try:
            import serial
        except ImportError:
            return None
        try:
            ser = serial.Serial(device, baud, timeout=0.5)
        except Exception:
            return None
        try:
            # El ESP32 resetea al abrir el puerto (toggle de DTR vía
            # CH340/CP2102 o el USB nativo) — mismo margen de arranque que
            # laser_service.py antes de mandar el primer comando, si no el
            # ID? se pierde. Solo aplica acá, en la rama sin conexión
            # persistente todavía: si ya existe una, la placa hace rato que
            # está arrancada y este sleep se salta.
            time.sleep(2)
            return _read_nopal_identification(ser, timeout)
        finally:
            try:
                ser.close()
            except Exception:
                pass


def list_usb_arduino_ports() -> List[Dict[str, Any]]:
    """Puertos USB candidatos para una placa de accesorios NOPAL: misma
    whitelist de chips que láser/CNC/Marlin (CH340, CP2102, ESP32), excluyendo
    lo ya reclamado por Klipper o ya registrado como láser/CNC o impresora
    Marlin, para que el mismo puerto físico no se ofrezca en varios flujos de
    alta a la vez (mismo criterio que list_usb_marlin_ports)."""
    from backend.services.laser_service import get_registered_lasers, list_usb_laser_ports
    from backend.services.marlin_printer_service import get_registered_printers

    laser_entries = [e for e in get_registered_lasers() if e.get("host", "").startswith("usb:")]
    claimed_laser_locations = {e["location"] for e in laser_entries if e.get("location")}
    claimed_laser_devices = {e["host"][len("usb:"):] for e in laser_entries if not e.get("location")}

    printer_entries = get_registered_printers()
    claimed_printer_locations = {e["location"] for e in printer_entries if e.get("location")}
    claimed_printer_devices = {
        e.get("device") for e in printer_entries if not e.get("location") and e.get("device")
    }

    claimed_locations = claimed_laser_locations | claimed_printer_locations
    claimed_devices = claimed_laser_devices | claimed_printer_devices

    return [
        port for port in list_usb_laser_ports()
        if port["device"] not in claimed_devices
        and not (port.get("location") and port["location"] in claimed_locations)
    ]


def _discover_arduino_boards_sync() -> List[Dict[str, Any]]:
    boards = []
    for port in list_usb_arduino_ports():
        identification = _probe_nopal_board_sync(port["device"])
        if identification is not None:
            boards.append({**port, **identification})
    return boards


async def discover_arduino_boards() -> List[Dict[str, Any]]:
    """Escanea los puertos USB candidatos y hace el handshake NOPAL:ID? en
    cada uno, en un hilo aparte (abrir puertos serie y esperar el margen de
    arranque de la placa no debe bloquear el event loop de FastAPI). Devuelve
    solo los que efectivamente contestaron como firmware NOPAL: el puerto que
    tomaron y el modelo/capacidades que declararon."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _discover_arduino_boards_sync)


# ── Registro de accesorios (persistido) ──

def _load_registry() -> List[Dict[str, Any]]:
    try:
        with open(REGISTRY_PATH, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError):
        return []


def _save_registry(entries: List[Dict[str, Any]]):
    try:
        with open(REGISTRY_PATH, "w", encoding="utf-8") as handle:
            json.dump(entries, handle, indent=2)
    except OSError:
        pass


def _public(entry: Dict[str, Any]) -> Dict[str, Any]:
    """Oculta credenciales (ej. token de Home Assistant, contraseña OTA de
    un accesorio arduino por WiFi) antes de devolver la entrada — no hay
    razón para que vuelvan en cada GET del listado."""
    config = dict(entry.get("config", {}))
    if "token" in config:
        config["token"] = "***"
    if "ota_password" in config:
        config["ota_password"] = "***"
    return {**entry, "config": config}


def get_accessories() -> List[Dict[str, Any]]:
    return [_public(e) for e in _load_registry()]


def register_accessory(name: str, kind: str, driver: str, config: Dict[str, Any]) -> Dict[str, Any]:
    spec = DRIVERS.get(driver)
    if spec is None:
        raise ValueError(f"Driver desconocido: {driver}")

    required = spec["required"](config) if callable(spec["required"]) else spec["required"]
    missing = [key for key in required if not config.get(key)]
    if missing:
        raise ValueError(f"Faltan campos de configuración: {', '.join(missing)}")

    entries = _load_registry()
    entry = {
        "id": uuid.uuid4().hex[:12],
        "name": name,
        "kind": kind or "other",
        "driver": driver,
        "config": config,
        "registered_at": time.time(),
    }
    entries.append(entry)
    _save_registry(entries)
    logger.info(f"Accesorio registrado: {name} ({driver}, {entry['kind']})")
    log_event(entry["id"], entry["name"], "registered", {"kind": entry["kind"], "driver": driver})
    return _public(entry)


def unregister_accessory(accessory_id: str) -> bool:
    entries = _load_registry()
    removed = next((e for e in entries if e.get("id") == accessory_id), None)
    filtered = [e for e in entries if e.get("id") != accessory_id]
    changed = len(filtered) != len(entries)
    if changed:
        _save_registry(filtered)
        logger.info(f"Accesorio eliminado: {accessory_id}")
        log_event(accessory_id, removed["name"] if removed else accessory_id, "removed")
    return changed


def rename_accessory(accessory_id: str, name: str) -> Optional[Dict[str, Any]]:
    entries = _load_registry()
    entry = next((e for e in entries if e.get("id") == accessory_id), None)
    if entry is None:
        return None
    old_name = entry["name"]
    entry["name"] = name
    _save_registry(entries)
    log_event(entry["id"], name, "renamed", {"from": old_name})
    return _public(entry)


def _get_accessories_status_sync() -> List[Dict[str, Any]]:
    result = []
    for entry in _load_registry():
        spec = DRIVERS.get(entry["driver"])
        state = spec["get_state"](entry["config"]) if spec else None
        result.append({**_public(entry), "on": state})
    return result


async def get_accessories_status() -> List[Dict[str, Any]]:
    """Versión async (en un hilo aparte) — mismo criterio que el probeo de
    red del registro de láseres: no bloquear el event loop de FastAPI
    mientras se esperan los timeouts HTTP de cada accesorio."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _get_accessories_status_sync)


async def set_accessory_power(accessory_id: str, on: bool) -> Optional[bool]:
    """None si el accesorio no existe en el registro; True/False según si el
    driver logró (o no) cambiar el estado."""
    entry = next((e for e in _load_registry() if e.get("id") == accessory_id), None)
    if entry is None:
        return None

    spec = DRIVERS.get(entry["driver"])
    if spec is None:
        return False

    loop = asyncio.get_event_loop()
    ok = await loop.run_in_executor(None, spec["set_state"], entry["config"], on)
    if ok:
        log_event(entry["id"], entry["name"], "power_on" if on else "power_off")
    return ok


async def set_accessory_led_color(accessory_id: str, red: int, green: int, blue: int) -> Optional[bool]:
    """None si el accesorio no existe o su driver no soporta color
    ("set_color"); True/False según si la placa confirmó el cambio. A
    diferencia de set_accessory_power, aquí SÍ se persiste el resultado en
    accessory_registry.json (led_color/led_on) porque el firmware no tiene
    forma de contestar "qué color tengo ahora" — sin esto, _arduino_get_state
    no tendría de dónde sacar un estado no inventado para tiras LED."""
    entries = _load_registry()
    entry = next((e for e in entries if e.get("id") == accessory_id), None)
    if entry is None:
        return None

    spec = DRIVERS.get(entry["driver"])
    set_color = spec.get("set_color") if spec else None
    if set_color is None:
        return None

    loop = asyncio.get_event_loop()
    ok = await loop.run_in_executor(None, set_color, entry["config"], red, green, blue)
    if ok:
        entry["config"]["led_color"] = [red, green, blue]
        entry["config"]["led_on"] = any((red, green, blue))
        _save_registry(entries)
        log_event(entry["id"], entry["name"], "led_color", {"color": [red, green, blue]})
    return ok

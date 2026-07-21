# Accesorios Arduino/ESP32 (plugin de NOPAL)

Controla relés, tiras LED y otros accesorios DIY conectados a una placa
Arduino/ESP32/ESP8266 con [firmware genérico de NOPAL](https://github.com/charlymigenes-ux/nopal),
sin depender de enchufes WiFi de terceros. Incluye detección automática por
USB, escenas (macros de varios accesorios a la vez), registro de actividad
reciente y actualización de firmware por USB (esptool) u OTA.

La portada **Control del taller** reúne el uso diario en una sola vista:
estado real de relés, control RGB de iluminación, telemetría de cada placa,
escenas persistidas y actividad reciente. El mapa de pines, flasheo,
automatizaciones y consola permanecen disponibles como herramientas avanzadas.

Desde la versión 2.3 también entiende el esquema de telemetría del firmware
ESP32 DevKit V1 3.x (ocho relés, WS2812, ADC, WiFi, heap y uptime), además del
formato clásico del firmware NOPAL 1.x/2.x.

## Instalación

Desde NOPAL → Configuración → Galería de plugins → Accesorios Arduino/ESP32
→ Instalar. NOPAL clona este repo a `plugins/arduino-accessories/` y carga
su backend/frontend automáticamente — no requiere pasos manuales.

## Desarrollo

Este plugin corre **en proceso con NOPAL** (no está sandboxeado): su
backend importa `backend.auth_deps` de NOPAL core para la autenticación, y
depende de que NOPAL lo cargue vía
`backend/services/plugin_loader_service.py` (imports relativos dentro de
`backend/` para que `router.py` pueda usar `from .services.accessory_service
import ...`).

También usa, a propósito, dos servicios de NOPAL core con import absoluto
(no son parte de este plugin, son una dependencia real e intencional): al
detectar puertos USB libres, evita ofrecer uno que ya esté en uso por un
láser/CNC (`backend.services.laser_service`) o una impresora Marlin
standalone (`backend.services.marlin_printer_service`) ya registrados.

Estructura:
```
nopal-plugin.json      # manifest (versión, entry points de frontend/backend)
frontend/               # arduino-accessories.js + .css, patrón NopalPluginRegistry
backend/
  router.py             # FastAPI APIRouter (entry point declarado en el manifest)
  services/
    accessory_service.py     # driver serie (USB) + HTTP (OTA/WiFi), registro
    accessory_scenes.py      # escenas (macros de varios accesorios)
    activity_log.py          # actividad reciente (on/off, escenas)
    firmware_flash_service.py  # flasheo de firmware por USB (esptool) / OTA
tests/
```

### Correr los tests

Los tests necesitan un checkout de [NOPAL core](https://github.com/charlymigenes-ux/nopal)
accesible (con sus dependencias de `requirements-dev.txt` instaladas) porque
este plugin depende de `backend.auth_deps` en tiempo de ejecución:

```bash
# Si este repo está clonado en plugins/arduino-accessories/ de un checkout de NOPAL:
cd plugins/arduino-accessories
pytest

# Si está en otro lado:
NOPAL_CORE_ROOT=/ruta/al/checkout/de/nopal pytest
```

## Limitaciones conocidas

- Requiere el firmware genérico de NOPAL flasheado en la placa (relés/tiras
  LED "de fábrica" sin ese firmware no son compatibles).
- La detección USB requiere que el proceso de NOPAL tenga permiso de
  lectura/escritura sobre `/dev/ttyUSB*` o `/dev/ttyACM*` (típicamente,
  pertenecer al grupo `dialout` del sistema).
- El flasheo por USB requiere `esptool` instalado en el equipo donde corre
  NOPAL.

---
title: Automatización de Taller: API
status: draft
verified_against: "nopal-plugin-arduino-accessories@d3a044c (2.6.0) · nopal@4346f72"
generated: true
---

# Automatización de Taller: API

> Página **generada** desde el código del plugin. No la edites a mano.

Prefijo(s) de ruta: `/api/accessories` · 43 rutas (Sesión (admin u operador): 19; Solo admin: 23; Pública: 1).

| Método | Ruta | Acceso | Política | Descripción |
|---|---|---|---|---|
| GET | `/api/accessories` | Sesión (admin u operador) | — | Accesorios IoT registrados (extractores, ventiladores, bombas, etc.). |
| POST | `/api/accessories` | Solo admin | — | Registra un accesorio nuevo. `config` es un JSON con los campos que pida el driver elegido (ej. para 'home_assistant': base_url, token, ent… |
| GET | `/api/accessories/{accessory_id}/firmware-status` | Sesión (admin u operador) | — | Prueba la placa de un accesorio WiFi con sus credenciales YA guardadas y devuelve modelo/firmware/protocolo actuales -- el paso "Buscando…… |
| GET | `/api/accessories/activity` | Sesión (admin u operador) | — | Historial reciente de eventos reales (encendidos, apagados, cambios de color, altas/bajas de accesorios, escenas ejecutadas) — ver activity… |
| GET | `/api/accessories/arduino/ambient-sensor` | Sesión (admin u operador) | — | Qué placa (si hay alguna) está marcada como sensor ambiente del taller -- ver board_pinmap_service.get_ambient_sensor_board_id(). Lo consul… |
| POST | `/api/accessories/arduino/ambient-sensor` | Solo admin | — | `board_id` vacío quita la selección (ninguna placa es el sensor ambiente). Devuelve 404 si se pidió una placa que no existe, en vez de guar… |
| GET | `/api/accessories/arduino/boards` | Sesión (admin u operador) | — | Placas agregadas a mano (catálogo + apodo) o adoptadas por el asistente de firmware, con la función/parámetros que el usuario le asignó a c… |
| POST | `/api/accessories/arduino/boards` | Solo admin | — | `pins` es el JSON {"left": [...], "right": [...]} tal cual lo arma el catálogo del frontend -- el backend no interpreta su forma, solo la p… |
| PUT | `/api/accessories/arduino/boards/{board_id}` | Solo admin | — | Edita nombre/puerto USB/IP de una placa ya agregada -- ver board_pinmap_service.update_board_info. No toca sus pines. |
| DELETE | `/api/accessories/arduino/boards/{board_id}` | Solo admin | — | — |
| PUT | `/api/accessories/arduino/boards/{board_id}/pins/{side}/{index}` | Solo admin | — | — |
| GET | `/api/accessories/arduino/discover` | Solo admin | — | Escanea los puertos USB en busca de placas ESP32 con el firmware NOPAL (firmware/nopal_accessory/) — para cada una que contesta, el puerto… |
| POST | `/api/accessories/arduino/lighting` | Solo admin | — | Alta directa de una luz conectada a una placa NOPAL existente. |
| GET | `/api/accessories/arduino/list-ports` | Solo admin | — | Puertos USB candidatos SIN exigir que ya respondan el handshake NOPAL (a diferencia de /discover) -- para el asistente de primer uso, donde… |
| POST | `/api/accessories/arduino/probe-wifi` | Solo admin | — | Prueba una placa NOPAL por IP antes de darla de alta por WiFi (mismas credenciales OTA que ya usa el flasheo por WiFi) — mismo propósito qu… |
| POST | `/api/accessories/arduino/relay` | Solo admin | — | Alta directa de un relé de una placa NOPAL existente -- misma idea que /api/accessories/arduino/lighting: la placa ya reportó cuántos relés… |
| GET | `/api/accessories/arduino/telemetry` | Sesión (admin u operador) | — | Estado real de las placas configuradas, por USB o WiFi. |
| GET | `/api/accessories/cluster/config` | Sesión (admin u operador) | — | Config de los avisos, token incluido: el usuario lo necesita para copiarlo al secrets.h de cada placa. |
| POST | `/api/accessories/cluster/config` | Solo admin | — | — |
| POST | `/api/accessories/cluster/config/rotate-token` | Solo admin | — | Token nuevo. Deja fuera a todas las placas hasta que se actualice su secrets.h -- es intencional, es lo que lo hace revocable. |
| POST | `/api/accessories/cluster/event` | Pública | — | Aviso de la placa maestra: una placa entró (o salió) del clúster. |
| GET | `/api/accessories/drivers` | Sesión (admin u operador) | — | Drivers disponibles (ej. 'home_assistant', 'http_relay') — para poblar el formulario de registro sin hardcodear la lista en el frontend. |
| GET | `/api/accessories/firmware/builds` | Sesión (admin u operador) | — | Binarios .bin ya subidos y disponibles para flashear. |
| GET | `/api/accessories/firmware/builds/{filename}/download` | Sesión (admin u operador) | — | Descarga un binario .bin ya subido -- para quien prefiera subirlo a mano desde el panel OTA de la propia placa (http://&lt;ip&gt;/update) en vez… |
| POST | `/api/accessories/firmware/flash-ota` | Solo admin | — | Flashea `filename` (ya subido) por red, contra el ElegantOTA que corre en la placa en `ip` (firmware 1.3+, Wi-Fi ya conectado). username/pa… |
| POST | `/api/accessories/firmware/flash-ota-for/{accessory_id}` | Solo admin | — | Igual que /firmware/flash-ota, pero usando la IP y credenciales OTA YA guardadas del accesorio en vez de pedírselas de nuevo al usuario --… |
| POST | `/api/accessories/firmware/flash-usb` | Solo admin | — | Flashea `filename` (ya subido, ver /firmware/upload) en la placa conectada en `device` (ej. /dev/ttyUSB1) usando esptool, offset 0x0. Suelt… |
| GET | `/api/accessories/firmware/source` | Sesión (admin u operador) | — | Descarga el .ino fuente del firmware actual del accesorio. |
| POST | `/api/accessories/firmware/upload` | Solo admin | — | Sube un binario .bin ya compilado (Export Compiled Binary) al servidor, para poder flashearlo después por USB u OTA. |
| POST | `/api/accessories/led` | Sesión (admin u operador) | — | Fija el color de una tira LED (PWM o WS2812) conectada a una placa NOPAL. Solo aplica a accesorios cuyo driver soporte 'set_color' (hoy, ún… |
| GET | `/api/accessories/machine-led/config` | Sesión (admin u operador) | — | Configuración de alertas visuales de una máquina y destinos LED reales. |
| POST | `/api/accessories/machine-led/config` | Solo admin | — | — |
| GET | `/api/accessories/machine-led/enabled` | Sesión (admin u operador) | — | Estado habilitado/deshabilitado de todas las máquinas configuradas, para pintar el ícono de ajustes LED en cada tarjeta sin abrir el modal. |
| POST | `/api/accessories/machine-led/state` | Sesión (admin u operador) | — | — |
| POST | `/api/accessories/power` | Sesión (admin u operador) | — | — |
| POST | `/api/accessories/remove` | Solo admin | — | — |
| POST | `/api/accessories/rename` | Solo admin | — | — |
| GET | `/api/accessories/scenes` | Sesión (admin u operador) | — | — |
| POST | `/api/accessories/scenes` | Solo admin | — | — |
| PUT | `/api/accessories/scenes/{scene_id}` | Solo admin | — | Igual que el POST de creación pero sobre una escena existente. |
| DELETE | `/api/accessories/scenes/{scene_id}` | Solo admin | — | — |
| POST | `/api/accessories/scenes/{scene_id}/run` | Sesión (admin u operador) | — | — |
| GET | `/api/accessories/status` | Sesión (admin u operador) | — | Igual que /api/accessories pero con el estado on/off en vivo de cada uno (probeo real contra el driver) — endpoint aparte porque ese probeo… |

El acceso mostrado es el declarado en cada ruta (`require_auth`, `require_role("admin")`). Una comprobación de rol dentro del cuerpo de la función no se detecta.

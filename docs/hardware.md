---
title: Automatización de Taller: hardware
status: draft
verified_against: "nopal-plugin-arduino-accessories@d3a044c (2.6.0) · nopal@4346f72"
---


# Hardware

## Firmware

El firmware vive en la carpeta `firmware/` de este repositorio, con una carpeta por placa física (Arduino exige que el nombre del `.ino` coincida con su carpeta):

| Carpeta | Contenido |
|---|---|
| `firmware/nopal_accessory/` | Firmware «FF» completo, para **ESP32 y ESP8266** en un solo sketch. Informa su variante como `esp32_generic_ff` o `esp8266_generic_ff` |
| `firmware/nopal_tcall_sim800l/` | Placa **AM-036 / T-Call SIM800L** (`utilities.h` tiene su mapa de pines) |
| `firmware/legacy/` | Sketches anteriores, solo como referencia. No se flashean |

Ambos sketches vivos comparten dos cabeceras: `nopal_cluster.h` (descubrimiento UDP, elección de líder y *heartbeat* con *failover*; se activa con `NOPAL_CLUSTER_ENABLE`) y `nopal_power.h` (medidor de batería MAX17048 por I2C, sirve `GET /api/power`; se activa con `NOPAL_POWER_MONITOR_ENABLE`, solo en `nopal_accessory/`). Ambas están **apagadas por defecto**.

La configuración de cada placa (banderas, pines, calibración, credenciales) va en su `secrets.h`, que **nunca se sube al repositorio**: solo existe `secrets.h.example`.

## Placas y accesorios

- ESP32, ESP8266 y Arduino compatibles con el firmware genérico.
- **Relés** (el esquema de telemetría de ESP32 DevKit V1 3.x usa ocho).
- **Tiras LED** WS2812 y RGB.
- Zumbador.

## Flasheo

- **Por USB** con `esptool`.
- **Por aire (OTA)** a una placa ya en la red.

:::caution Pendiente de confirmar
Los modelos de placa concretos probados por el autor no constan en el código ni en el README.
:::

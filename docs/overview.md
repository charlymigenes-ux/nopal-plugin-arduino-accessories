---
title: Automatización de Taller: visión general
status: draft
verified_against: "nopal-plugin-arduino-accessories@d3a044c (2.6.0) · nopal@4346f72"
---


# Automatización de Taller (accesorios Arduino/ESP32)

Controla **relés, tiras LED y otros accesorios** caseros conectados a una placa Arduino, ESP32 o ESP8266 con el **firmware genérico de NOPAL**, sin depender de enchufes WiFi de terceros.

## Qué incluye

- **Control del taller** (portada): estado real de los relés, control RGB de la iluminación, telemetría de cada placa, **escenas** guardadas y actividad reciente.
- **Detección automática** de placas por USB.
- **Escenas**: macros que encienden o apagan varios accesorios a la vez.
- **Registro de actividad reciente** (encendidos, apagados y escenas).
- **Actualización de firmware** por USB (`esptool`) o por aire (OTA).
- **Automatizaciones por máquina**: las tiras LED pueden cambiar de color según el estado de cada máquina (calentando, imprimiendo, error…).
- Herramientas avanzadas: mapa de pines, flasheo, automatizaciones y consola.

Desde la versión 2.3 entiende también el esquema de telemetría del firmware **ESP32 DevKit V1 3.x** (ocho relés, WS2812, ADC, WiFi, memoria y *uptime*), además del formato clásico del firmware NOPAL 1.x/2.x.

:::warning Permiso sensible
Este plugin puede **flashear firmware** por USB u OTA. Es el permiso más sensible de los tres que declara.
:::

## Documentos relacionados

[Instalación](installation.md) · [Configuración](configuration.md) · [Hardware](hardware.md) · [API](api.md) · [Solución de problemas](troubleshooting.md)

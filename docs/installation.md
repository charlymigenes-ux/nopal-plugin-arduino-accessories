---
title: Automatización de Taller: instalación
status: draft
verified_against: "nopal-plugin-arduino-accessories@d3a044c (2.6.0) · nopal@4346f72"
---


# Instalación

1. En NOPAL: **Configuración → Galería de plugins → Accesorios Arduino/ESP32 → Instalar**. NOPAL clona el repositorio en `plugins/arduino-accessories/` y carga el frontend al momento.
2. **Reinicia NOPAL** para cargar el backend.
3. Flashea el **firmware genérico de NOPAL** en tu placa (ver [Hardware](hardware.md)).

## Requisitos del equipo

| Requisito | Para qué |
|---|---|
| Permiso de lectura y escritura sobre `/dev/ttyUSB*` o `/dev/ttyACM*` para el usuario que ejecuta NOPAL (normalmente el grupo `dialout`) | Detectar y usar placas por USB |
| **`esptool`** instalado en el equipo | Flashear por USB |
| La placa debe llevar el **firmware genérico de NOPAL** | Relés o tiras con firmware de fábrica **no** son compatibles |

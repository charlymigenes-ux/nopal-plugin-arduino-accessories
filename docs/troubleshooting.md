---
title: Automatización de Taller: solución de problemas
status: draft
verified_against: "nopal-plugin-arduino-accessories@d3a044c (2.6.0) · nopal@4346f72"
---


# Solución de problemas

| Problema | Qué hacer |
|---|---|
| No se detecta ninguna placa por USB | Comprueba el cable y que el usuario de NOPAL tenga permiso sobre `/dev/ttyUSB*` o `/dev/ttyACM*`: `sudo usermod -aG dialout <usuario>` y reinicia NOPAL |
| La placa aparece pero no responde | Debe llevar el **firmware genérico de NOPAL**. El de fábrica no es compatible |
| No se puede flashear por USB | Falta `esptool` en el equipo donde corre NOPAL |
| Un puerto USB no se ofrece | Ya lo usa un láser/CNC o una impresora Marlin registrada: el plugin lo omite a propósito |
| Tras actualizar el plugin no cambia nada | Si la actualización toca `backend/`, hay que **reiniciar NOPAL** |
| La telemetría se ve distinta según la placa | Desde la 2.3 se admiten dos esquemas: el clásico (NOPAL 1.x/2.x) y el del firmware ESP32 DevKit V1 3.x |

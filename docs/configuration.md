---
title: Automatización de Taller: configuración
status: draft
verified_against: "nopal-plugin-arduino-accessories@d3a044c (2.6.0) · nopal@4346f72"
---


# Configuración

Las placas se dan de alta y se configuran desde **Configuración → Accesorios** y desde la sección **Automatización de Taller**.

## Archivos que crea el plugin

| Archivo | Contenido |
|---|---|
| `accessory_registry.json` | Placas registradas |
| `arduino_boards_config.json` | Configuración de placas y mapa de pines |
| `data/accessories/scenes.json` | Escenas |
| `data/accessories/activity_log.json` | Actividad reciente |
| `data/accessories/cluster_events.json` | Configuración de avisos del clúster, incluido el **token compartido** |
| `data/accessories/machine_led_rules.json` | Reglas de LED por máquina |

## Token del clúster

Una placa maestra avisa a NOPAL cuando otra entra o sale del clúster mediante `POST /api/accessories/cluster/event`. Esta es **la única ruta del plugin sin sesión**: la llama el firmware, que no tiene cookies. Se autentica con un token compartido en la cabecera `X-NOPAL-Token`, que NOPAL compara en tiempo constante con el guardado en `cluster_events.json`. Si es inválido responde 401.

:::caution Pendiente de documentar
Cómo se genera y se rota ese token no está documentado en el README del plugin.
:::

## Dependencias del core

El plugin importa a propósito dos servicios del core con import absoluto: evita ofrecer un puerto USB que ya use un láser/CNC (`backend.services.laser_service`) o una impresora Marlin independiente (`backend.services.marlin_printer_service`).

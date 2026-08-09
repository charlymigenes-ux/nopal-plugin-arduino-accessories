from pathlib import Path


PLUGIN_ROOT = Path(__file__).resolve().parents[1]


def test_workshop_overview_uses_real_accessory_endpoints():
    javascript = (PLUGIN_ROOT / "frontend" / "arduino-accessories.js").read_text(encoding="utf-8")
    for endpoint in (
        "/api/accessories/status",
        "/api/accessories/scenes",
        "/api/accessories/activity",
        "/api/accessories/arduino/telemetry",
        "/api/accessories/power",
        "/api/accessories/led",
    ):
        assert endpoint in javascript


def test_workshop_overview_exposes_approved_sections_and_actions():
    javascript = (PLUGIN_ROOT / "frontend" / "arduino-accessories.js").read_text(encoding="utf-8")
    assert "view: 'overview'" in javascript
    for marker in (
        "Accesorios Arduino/ESP32",
        "data-wsa-overview-tab",
        "data-wsa-workshop-power",
        "data-wsa-workshop-led-apply",
        "data-wsa-workshop-scene",
        "Telemetría de la placa",
    ):
        assert marker in javascript


def test_plugin_version_matches_frontend_registry():
    manifest = (PLUGIN_ROOT / "nopal-plugin.json").read_text(encoding="utf-8")
    javascript = (PLUGIN_ROOT / "frontend" / "arduino-accessories.js").read_text(encoding="utf-8")
    assert '"version": "2.5.0"' in manifest
    assert "PLUGIN_VERSION = '2.5.0'" in javascript


def test_add_board_uses_one_connection_wizard_and_detected_pin_profile():
    javascript = (PLUGIN_ROOT / "frontend" / "arduino-accessories.js").read_text(encoding="utf-8")
    assert 'id="wsa-addboard-btn"' in javascript
    assert 'id="wsa-connect-btn"' not in javascript
    assert 'id="wsa-addboard-panel"' not in javascript
    assert "function catalogIdForDiscoveredBoard" in javascript
    for identity in ("tcall", "wemos", "nodemcu", "esp8266", "esp32_devkit"):
        assert identity in javascript
    assert "state.wizard.step = 'manual'" in javascript
    assert "state.wizard.step = 'identify'" in javascript
    assert "pins: JSON.stringify(board.pins)" in javascript


def test_classic_dashboard_design_keeps_real_controls_and_documentation():
    javascript = (PLUGIN_ROOT / "frontend" / "arduino-accessories.js").read_text(encoding="utf-8")
    stylesheet = (PLUGIN_ROOT / "frontend" / "arduino-accessories.css").read_text(encoding="utf-8")
    for marker in (
        "Accesorios Arduino/ESP32",
        "Documentación",
        "Resumen del sistema",
        "Consumo y voltaje",
        "Estado de conexión",
        "Dispositivos y controles",
        "Actividad reciente",
        "Información del dispositivo",
        "Seguridad eléctrica",
        "Comandos NOPAL",
    ):
        assert marker in javascript
    assert "data-wsa-workshop-power" in javascript
    assert "data-wsa-workshop-scene" in javascript
    assert ".wsa-classic-dashboard" in stylesheet
    assert ".wsa-docs-grid" in stylesheet

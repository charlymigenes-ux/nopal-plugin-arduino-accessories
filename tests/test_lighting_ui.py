from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_plugin_has_native_lighting_registration_flow():
    javascript = (ROOT / "frontend/arduino-accessories.js").read_text(encoding="utf-8")
    stylesheet = (ROOT / "frontend/arduino-accessories.css").read_text(encoding="utf-8")
    assert "function openLightingEditor" in javascript
    assert "/api/accessories/arduino/lighting" in javascript
    assert "Cantidad de LEDs" in javascript
    assert "Agregar LED o tira" in javascript
    assert "data-wsa-led-preset" in javascript
    assert ".wsa-lighting-modal" in stylesheet

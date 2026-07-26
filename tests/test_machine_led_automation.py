import json

import pytest

from .conftest import accessory_service, machine_led_automation


@pytest.fixture(autouse=True)
def _no_real_wifi_probe(monkeypatch):
    """get_led_targets() sondea en vivo la IP de cada tira WiFi para
    refrescar protocolo/cantidad de LEDs tras una OTA -- pero 192.168.0.85
    (la IP fija que usan los tests de este archivo) resulta alcanzable
    desde algunas redes reales, lo que hacía que el protocolo declarado acá
    (ej. 3) quedara pisado por el que reporte lo que sea que responda en
    esa IP en ese momento, y el resultado de save_config() dependiera de
    condiciones de red en vez de la config declarada por el test. Mockeado
    a "sin respuesta" (comportamiento real de una IP inexistente) para que
    estos tests sean deterministas sin importar la red donde se corran."""
    monkeypatch.setattr(accessory_service, "probe_wifi_board", lambda ip, user, password: None)


def _register_strip(protocol=3, count=12, show_on_panel=None):
    config = {
        "transport": "wifi",
        "ip": "192.168.0.85",
        "led_mode": "ws2812",
        "ws2812_count": count,
        "protocol": protocol,
    }
    if show_on_panel is not None:
        config["show_on_panel"] = show_on_panel
    return accessory_service.register_accessory("Tira del taller", "led_strip", "arduino", config)


def test_machine_led_config_requires_real_registered_strip(client, as_admin):
    response = client.get("/api/accessories/machine-led/config", params={
        "machine_type": "marlin", "machine_id": "/dev/ttyUSB2",
    })
    assert response.status_code == 200
    assert response.json()["targets"] == []


def test_protocol_3_accepts_whole_strip_but_rejects_segments(client, as_admin):
    strip = _register_strip(protocol=3, count=12)
    base = {
        "machine_type": "marlin",
        "machine_id": "/dev/ttyUSB2",
        "machine_name": "ANET ET4",
        "enabled": "true",
        "accessory_id": strip["id"],
        "colors": json.dumps(machine_led_automation.DEFAULT_COLORS),
    }
    whole = client.post("/api/accessories/machine-led/config", data={**base, "start": 0, "count": 12})
    assert whole.status_code == 200
    partial = client.post("/api/accessories/machine-led/config", data={**base, "start": 0, "count": 6})
    assert partial.status_code == 400
    assert "protocolo 4" in partial.json()["detail"]


def test_protocol_4_persists_independent_machine_segment(client, as_admin):
    strip = _register_strip(protocol=4, count=12)
    response = client.post("/api/accessories/machine-led/config", data={
        "machine_type": "klipper",
        "machine_id": "7125",
        "machine_name": "Voron",
        "enabled": "true",
        "accessory_id": strip["id"],
        "start": 3,
        "count": 5,
        "colors": json.dumps({"heating": [9, 8, 7]}),
    })
    assert response.status_code == 200
    saved = response.json()
    assert (saved["start"], saved["count"]) == (3, 5)
    assert saved["colors"]["heating"] == [9, 8, 7]
    assert saved["colors"]["error"] == machine_led_automation.DEFAULT_COLORS["error"]


def _configure_machine(client, strip, machine_id="7125", start=0, count=4, colors=None):
    return client.post("/api/accessories/machine-led/config", data={
        "machine_type": "klipper",
        "machine_id": machine_id,
        "machine_name": "Voron",
        "enabled": "true",
        "accessory_id": strip["id"],
        "start": start,
        "count": count,
        "colors": json.dumps(colors or machine_led_automation.DEFAULT_COLORS),
    })


class TestApplyStateRenderInfo:
    """apply_state() ahora siempre devuelve runs/show_on_panel (para que el
    panel pueda dibujar la réplica de LEDs en la tarjeta), no solo cuando de
    verdad escribe al hardware."""

    def test_not_configured_returns_empty_render_info(self, client, as_admin):
        response = client.post("/api/accessories/machine-led/state", data={
            "machine_type": "klipper", "machine_id": "nope", "state": "printing",
        })
        assert response.status_code == 200
        body = response.json()
        assert body == {"applied": False, "reason": "not_configured", "show_on_panel": False, "runs": []}

    def test_flat_state_reports_single_run_and_show_on_panel_default_true(self, client, as_admin, monkeypatch):
        monkeypatch.setattr(accessory_service, "set_accessory_led_segment", _fake_set_segment)
        strip = _register_strip(protocol=4, count=12)  # sin show_on_panel explícito
        _configure_machine(client, strip, start=2, count=4)
        response = client.post("/api/accessories/machine-led/state", data={
            "machine_type": "klipper", "machine_id": "7125", "state": "printing",
        })
        assert response.status_code == 200
        body = response.json()
        assert body["applied"] is True
        assert body["show_on_panel"] is True
        assert body["runs"] == [{"start": 0, "count": 4, "color": machine_led_automation.DEFAULT_COLORS["printing"]}]

    def test_show_on_panel_false_is_respected(self, client, as_admin, monkeypatch):
        monkeypatch.setattr(accessory_service, "set_accessory_led_segment", _fake_set_segment)
        strip = _register_strip(protocol=4, count=12, show_on_panel=False)
        _configure_machine(client, strip, start=0, count=3)
        response = client.post("/api/accessories/machine-led/state", data={
            "machine_type": "klipper", "machine_id": "7125", "state": "idle",
        })
        assert response.json()["show_on_panel"] is False

    def test_heating_gradient_reports_multiple_runs(self, client, as_admin, monkeypatch):
        monkeypatch.setattr(accessory_service, "set_accessory_led_segment", _fake_set_segment)
        strip = _register_strip(protocol=4, count=12)
        _configure_machine(client, strip, start=0, count=8)
        response = client.post("/api/accessories/machine-led/state", data={
            "machine_type": "klipper", "machine_id": "7125", "state": "heating", "progress": 50,
        })
        body = response.json()
        assert body["applied"] is True
        assert sum(run["count"] for run in body["runs"]) == 8

    def test_unchanged_state_still_returns_render_info(self, client, as_admin, monkeypatch):
        monkeypatch.setattr(accessory_service, "set_accessory_led_segment", _fake_set_segment)
        strip = _register_strip(protocol=4, count=12)
        _configure_machine(client, strip, start=0, count=4)
        first = client.post("/api/accessories/machine-led/state", data={
            "machine_type": "klipper", "machine_id": "7125", "state": "printing",
        })
        assert first.json()["applied"] is True
        second = client.post("/api/accessories/machine-led/state", data={
            "machine_type": "klipper", "machine_id": "7125", "state": "printing",
        })
        body = second.json()
        assert body["applied"] is False
        assert body["reason"] == "unchanged"
        assert body["show_on_panel"] is True
        assert body["runs"] == [{"start": 0, "count": 4, "color": machine_led_automation.DEFAULT_COLORS["printing"]}]


async def _fake_set_segment(accessory_id, start, count, r, g, b):
    return True


class TestGetLedTargetsShowOnPanel:
    def test_defaults_true_for_strips_registered_before_this_flag_existed(self, client, as_admin):
        _register_strip(protocol=4, count=12)  # sin show_on_panel en config
        targets = machine_led_automation.get_led_targets()
        assert targets[0]["show_on_panel"] is True

    def test_respects_explicit_false(self, client, as_admin):
        _register_strip(protocol=4, count=12, show_on_panel=False)
        targets = machine_led_automation.get_led_targets()
        assert targets[0]["show_on_panel"] is False

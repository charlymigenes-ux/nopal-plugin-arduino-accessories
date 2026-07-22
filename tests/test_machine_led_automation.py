import json

from .conftest import accessory_service, machine_led_automation


def _register_strip(protocol=3, count=12):
    return accessory_service.register_accessory(
        "Tira del taller",
        "led_strip",
        "arduino",
        {
            "transport": "wifi",
            "ip": "192.168.0.85",
            "led_mode": "ws2812",
            "ws2812_count": count,
            "protocol": protocol,
        },
    )


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

import json

from .conftest import accessory_service


RELAY_CONFIG = {"on_url": "http://192.168.1.80/on", "off_url": "http://192.168.1.80/off"}


def _register(client, as_admin, name="Extractor", driver="http_relay", config=None, kind="other"):
    response = client.post(
        "/api/accessories",
        data={"name": name, "kind": kind, "driver": driver, "config": json.dumps(config or RELAY_CONFIG)},
    )
    assert response.status_code == 200
    return response.json()


class TestAccessoryRegister:
    def test_register_success(self, client, as_admin):
        entry = _register(client, as_admin)
        assert entry["name"] == "Extractor"
        assert entry["driver"] == "http_relay"
        assert entry["config"] == RELAY_CONFIG

    def test_requires_admin(self, client, as_operator):
        response = client.post(
            "/api/accessories",
            data={"name": "x", "kind": "other", "driver": "http_relay", "config": json.dumps(RELAY_CONFIG)},
        )
        assert response.status_code == 403

    def test_requires_auth(self, client):
        response = client.post(
            "/api/accessories",
            data={"name": "x", "kind": "other", "driver": "http_relay", "config": json.dumps(RELAY_CONFIG)},
        )
        assert response.status_code == 401

    def test_unknown_driver_rejected(self, client, as_admin):
        response = client.post(
            "/api/accessories",
            data={"name": "x", "kind": "other", "driver": "no-existe", "config": "{}"},
        )
        assert response.status_code == 400

    def test_missing_required_config_rejected(self, client, as_admin):
        response = client.post(
            "/api/accessories",
            data={"name": "x", "kind": "other", "driver": "http_relay", "config": "{}"},
        )
        assert response.status_code == 400

    def test_invalid_json_config_rejected(self, client, as_admin):
        response = client.post(
            "/api/accessories",
            data={"name": "x", "kind": "other", "driver": "http_relay", "config": "no-es-json"},
        )
        assert response.status_code == 400

    def test_credentials_hidden_in_listing(self, client, as_admin):
        _register(
            client, as_admin, driver="home_assistant",
            config={"base_url": "http://ha.local:8123", "token": "supersecreto", "entity_id": "switch.x"},
        )
        response = client.get("/api/accessories")
        assert response.status_code == 200
        entries = response.json()["accessories"]
        assert entries[0]["config"]["token"] == "***"


class TestAccessoryList:
    def test_list_requires_only_auth_not_admin(self, client, as_operator):
        response = client.get("/api/accessories")
        assert response.status_code == 200

    def test_list_requires_auth(self, client):
        response = client.get("/api/accessories")
        assert response.status_code == 401


class TestAccessoryRemove:
    def test_remove_requires_admin(self, client, as_operator):
        response = client.post("/api/accessories/remove", data={"id": "whatever"})
        assert response.status_code == 403

    def test_remove_unknown_returns_404(self, client, as_admin):
        response = client.post("/api/accessories/remove", data={"id": "no-existe"})
        assert response.status_code == 404

    def test_remove_existing(self, client, as_admin):
        entry = _register(client, as_admin)
        response = client.post("/api/accessories/remove", data={"id": entry["id"]})
        assert response.status_code == 200
        assert client.get("/api/accessories").json()["accessories"] == []


class TestAccessoryRename:
    def test_rename_requires_admin(self, client, as_operator):
        response = client.post("/api/accessories/rename", data={"id": "x", "name": "y"})
        assert response.status_code == 403

    def test_rename_unknown_returns_404(self, client, as_admin):
        response = client.post("/api/accessories/rename", data={"id": "no-existe", "name": "y"})
        assert response.status_code == 404

    def test_rename_success(self, client, as_admin):
        entry = _register(client, as_admin)
        response = client.post("/api/accessories/rename", data={"id": entry["id"], "name": "Nuevo nombre"})
        assert response.status_code == 200
        assert response.json()["name"] == "Nuevo nombre"


class TestAccessoryPower:
    def test_power_unknown_returns_404(self, client, as_admin):
        response = client.post("/api/accessories/power", data={"id": "no-existe", "on": "true"})
        assert response.status_code == 404

    def test_power_toggle_hits_configured_url(self, client, as_admin, monkeypatch):
        entry = _register(client, as_admin)
        calls = []

        class FakeResponse:
            ok = True

        def fake_get(url, timeout=None):
            calls.append(url)
            return FakeResponse()

        monkeypatch.setattr(accessory_service.requests, "get", fake_get)
        response = client.post("/api/accessories/power", data={"id": entry["id"], "on": "true"})
        assert response.status_code == 200
        assert calls == [RELAY_CONFIG["on_url"]]

    def test_power_toggle_failure_returns_502(self, client, as_admin, monkeypatch):
        entry = _register(client, as_admin)

        class FakeResponse:
            ok = False

        monkeypatch.setattr(accessory_service.requests, "get", lambda url, timeout=None: FakeResponse())
        response = client.post("/api/accessories/power", data={"id": entry["id"], "on": "true"})
        assert response.status_code == 502


class TestAccessoryLed:
    def test_led_out_of_range_rejected(self, client, as_admin):
        entry = _register(client, as_admin, driver="arduino", config={"device": "/dev/ttyUSB0"})
        response = client.post("/api/accessories/led", data={"id": entry["id"], "r": 300, "g": 0, "b": 0})
        assert response.status_code == 400

    def test_led_unsupported_driver_returns_404(self, client, as_admin):
        entry = _register(client, as_admin)
        response = client.post("/api/accessories/led", data={"id": entry["id"], "r": 1, "g": 2, "b": 3})
        assert response.status_code == 404

    def test_register_neopixel_directly_from_wifi_board(self, client, as_admin):
        response = client.post("/api/accessories/arduino/lighting", data={
            "name": "NeoPixel impresoras",
            "transport": "wifi",
            "ip": "192.168.0.85",
            "mode": "ws2812",
            "gpio": 23,
            "count": 8,
            "protocol": 3,
        })
        assert response.status_code == 200
        entry = response.json()
        assert entry["kind"] == "led_strip"
        assert entry["config"]["ip"] == "192.168.0.85"
        assert entry["config"]["gpio"] == 23
        assert entry["config"]["led_count"] == 8

    def test_register_single_led_and_validate_count(self, client, as_admin):
        good = client.post("/api/accessories/arduino/lighting", data={
            "name": "LED de estado", "transport": "usb", "device": "/dev/ttyUSB0",
            "mode": "ws2812", "gpio": 4, "count": 1,
        })
        assert good.status_code == 200
        bad = client.post("/api/accessories/arduino/lighting", data={
            "name": "Vacía", "transport": "usb", "device": "/dev/ttyUSB0",
            "mode": "ws2812", "gpio": 4, "count": 0,
        })
        assert bad.status_code == 400


class TestAccessoryDrivers:
    def test_drivers_lists_known_names(self, client, as_operator):
        response = client.get("/api/accessories/drivers")
        assert response.status_code == 200
        assert set(response.json()["drivers"]) == {"tasmota", "home_assistant", "http_relay", "arduino"}


class TestAccessoryDiscover:
    def test_discover_requires_admin(self, client, as_operator):
        response = client.get("/api/accessories/arduino/discover")
        assert response.status_code == 403


class TestAccessoryActivity:
    def test_activity_empty_by_default(self, client, as_operator):
        response = client.get("/api/accessories/activity")
        assert response.status_code == 200
        assert response.json()["activity"] == []

    def test_registering_logs_activity(self, client, as_admin):
        _register(client, as_admin)
        response = client.get("/api/accessories/activity")
        events = response.json()["activity"]
        assert len(events) == 1
        assert events[0]["action"] == "registered"


class TestAccessoryScenes:
    def test_scenes_empty_by_default(self, client, as_operator):
        response = client.get("/api/accessories/scenes")
        assert response.status_code == 200
        assert response.json()["scenes"] == []

    def test_create_run_delete_scene(self, client, as_admin, monkeypatch):
        entry = _register(client, as_admin)
        monkeypatch.setattr(accessory_service.requests, "get", lambda url, timeout=None: type("R", (), {"ok": True})())

        actions = json.dumps([{"accessory_id": entry["id"], "on": True}])
        create_response = client.post("/api/accessories/scenes", data={"name": "Encender todo", "actions": actions})
        assert create_response.status_code == 200
        scene = create_response.json()
        assert scene["name"] == "Encender todo"

        run_response = client.post(f"/api/accessories/scenes/{scene['id']}/run")
        assert run_response.status_code == 200
        assert run_response.json()["success"] is True

        delete_response = client.delete(f"/api/accessories/scenes/{scene['id']}")
        assert delete_response.status_code == 200
        assert client.get("/api/accessories/scenes").json()["scenes"] == []

    def test_run_unknown_scene_returns_404(self, client, as_operator):
        response = client.post("/api/accessories/scenes/no-existe/run")
        assert response.status_code == 404

    def test_delete_unknown_scene_returns_404(self, client, as_admin):
        response = client.delete("/api/accessories/scenes/no-existe")
        assert response.status_code == 404

    def test_create_scene_requires_admin(self, client, as_operator):
        response = client.post("/api/accessories/scenes", data={"name": "x", "actions": "[]"})
        assert response.status_code == 403

    def test_toggle_scene_alternates_variants_on_each_run(self, client, as_admin, monkeypatch):
        entry = _register(client, as_admin)
        monkeypatch.setattr(accessory_service.requests, "get", lambda url, timeout=None: type("R", (), {"ok": True})())

        variants = json.dumps([
            {"name": "Encendido", "actions": [{"accessory_id": entry["id"], "on": True}]},
            {"name": "Apagado", "actions": [{"accessory_id": entry["id"], "on": False}]},
        ])
        create_response = client.post(
            "/api/accessories/scenes",
            data={"name": "Aro LED", "mode": "toggle", "variants": variants},
        )
        assert create_response.status_code == 200
        scene = create_response.json()
        assert scene["mode"] == "toggle"
        assert scene["current_state_name"] == "Encendido"

        # Primera ejecución: pasa al estado siguiente (Apagado), no repite el inicial.
        client.post(f"/api/accessories/scenes/{scene['id']}/run")
        after_first = client.get("/api/accessories/scenes").json()["scenes"][0]
        assert after_first["current_state_name"] == "Apagado"

        # Segunda ejecución: vuelve a Encendido (ciclo cerrado de 2 estados).
        client.post(f"/api/accessories/scenes/{scene['id']}/run")
        after_second = client.get("/api/accessories/scenes").json()["scenes"][0]
        assert after_second["current_state_name"] == "Encendido"

    def test_toggle_scene_requires_at_least_two_variants(self, client, as_admin):
        variants = json.dumps([{"name": "Solo uno", "actions": [{"accessory_id": "x", "on": True}]}])
        response = client.post(
            "/api/accessories/scenes",
            data={"name": "Incompleta", "mode": "toggle", "variants": variants},
        )
        assert response.status_code == 400


class TestFirmwareBuilds:
    def test_builds_empty_by_default(self, client, as_operator):
        response = client.get("/api/accessories/firmware/builds")
        assert response.status_code == 200
        assert response.json()["builds"] == []

    def test_upload_rejects_non_bin(self, client, as_admin):
        response = client.post(
            "/api/accessories/firmware/upload",
            files={"file": ("firmware.txt", b"not a binary", "text/plain")},
        )
        assert response.status_code == 400

    def test_upload_requires_admin(self, client, as_operator):
        response = client.post(
            "/api/accessories/firmware/upload",
            files={"file": ("firmware.bin", b"\x00\x01\x02", "application/octet-stream")},
        )
        assert response.status_code == 403

    def test_upload_then_listed(self, client, as_admin):
        upload_response = client.post(
            "/api/accessories/firmware/upload",
            files={"file": ("firmware.bin", b"\x00\x01\x02", "application/octet-stream")},
        )
        assert upload_response.status_code == 200
        assert upload_response.json()["build"]["filename"] == "firmware.bin"

        builds = client.get("/api/accessories/firmware/builds").json()["builds"]
        assert len(builds) == 1
        assert builds[0]["filename"] == "firmware.bin"

    def test_flash_usb_unknown_build_rejected(self, client, as_admin):
        response = client.post(
            "/api/accessories/firmware/flash-usb",
            data={"device": "/dev/ttyUSB0", "filename": "no-existe.bin"},
        )
        assert response.status_code == 400

    def test_flash_usb_requires_admin(self, client, as_operator):
        response = client.post(
            "/api/accessories/firmware/flash-usb",
            data={"device": "/dev/ttyUSB0", "filename": "no-existe.bin"},
        )
        assert response.status_code == 403

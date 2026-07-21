import json

PINS = {"left": [{"gpio": "GPIO4", "physical": 1, "label": "Libre", "category": "free"}], "right": []}


def _add_board(client, as_admin, name="Taller Principal", catalog_id="esp32_devkit", pins=None):
    response = client.post(
        "/api/accessories/arduino/boards",
        data={"catalog_id": catalog_id, "name": name, "pins": json.dumps(pins or PINS)},
    )
    assert response.status_code == 200
    return response.json()


class TestArduinoBoardsList:
    def test_empty_by_default(self, client, as_admin):
        response = client.get("/api/accessories/arduino/boards")
        assert response.status_code == 200
        assert response.json() == {"boards": []}

    def test_requires_auth(self, client):
        response = client.get("/api/accessories/arduino/boards")
        assert response.status_code == 401


class TestArduinoBoardsAdd:
    def test_add_success(self, client, as_admin):
        board = _add_board(client, as_admin)
        assert board["name"] == "Taller Principal"
        assert board["catalog_id"] == "esp32_devkit"
        assert board["pins"] == PINS
        assert board["id"]

        listed = client.get("/api/accessories/arduino/boards").json()["boards"]
        assert len(listed) == 1
        assert listed[0]["id"] == board["id"]

    def test_requires_admin(self, client, as_operator):
        response = client.post(
            "/api/accessories/arduino/boards",
            data={"catalog_id": "esp32_devkit", "name": "x", "pins": json.dumps(PINS)},
        )
        assert response.status_code == 403

    def test_invalid_pins_json_rejected(self, client, as_admin):
        response = client.post(
            "/api/accessories/arduino/boards",
            data={"catalog_id": "esp32_devkit", "name": "x", "pins": "no-es-json"},
        )
        assert response.status_code == 400

    def test_device_and_ip_persisted(self, client, as_admin):
        board = _add_board(client, as_admin)
        response = client.post(
            "/api/accessories/arduino/boards",
            data={"catalog_id": "esp32_devkit", "name": "Placa WiFi", "pins": json.dumps(PINS), "ip": "192.168.0.83"},
        )
        assert response.json()["ip"] == "192.168.0.83"
        assert response.json()["device"] is None


class TestArduinoBoardsUpdatePin:
    def test_update_pin_success(self, client, as_admin):
        board = _add_board(client, as_admin)
        response = client.put(
            f"/api/accessories/arduino/boards/{board['id']}/pins/left/0",
            data={
                "category": "led_ws2812",
                "common": json.dumps({"mode": "Salida", "invertOutput": True}),
                "params": json.dumps({"stripType": "WS2812B", "ledCount": "8"}),
            },
        )
        assert response.status_code == 200
        pin = response.json()["pins"]["left"][0]
        assert pin["category"] == "led_ws2812"
        assert pin["common"]["invertOutput"] is True
        assert pin["params"]["ledCount"] == "8"

        # Se guardó de verdad -- no solo en la respuesta.
        listed = client.get("/api/accessories/arduino/boards").json()["boards"]
        assert listed[0]["pins"]["left"][0]["category"] == "led_ws2812"

    def test_unknown_board_404(self, client, as_admin):
        response = client.put(
            "/api/accessories/arduino/boards/no-existe/pins/left/0",
            data={"category": "relay", "common": "{}", "params": "{}"},
        )
        assert response.status_code == 404

    def test_out_of_range_index_404(self, client, as_admin):
        board = _add_board(client, as_admin)
        response = client.put(
            f"/api/accessories/arduino/boards/{board['id']}/pins/left/99",
            data={"category": "relay", "common": "{}", "params": "{}"},
        )
        assert response.status_code == 404

    def test_invalid_side_rejected(self, client, as_admin):
        board = _add_board(client, as_admin)
        response = client.put(
            f"/api/accessories/arduino/boards/{board['id']}/pins/up/0",
            data={"category": "relay", "common": "{}", "params": "{}"},
        )
        assert response.status_code == 400

    def test_requires_admin(self, client, as_operator):
        response = client.put(
            "/api/accessories/arduino/boards/any/pins/left/0",
            data={"category": "relay", "common": "{}", "params": "{}"},
        )
        assert response.status_code == 403


class TestArduinoBoardsUpdateInfo:
    def test_rename_board(self, client, as_admin):
        board = _add_board(client, as_admin, name="Original")
        response = client.put(f"/api/accessories/arduino/boards/{board['id']}", data={"name": "Renombrada"})
        assert response.status_code == 200
        entry = response.json()
        assert entry["name"] == "Renombrada"
        # No se tocaron device/ip al no mandarlos.
        assert entry["device"] is None
        assert entry["ip"] is None

    def test_update_device_and_ip(self, client, as_admin):
        board = _add_board(client, as_admin)
        response = client.put(
            f"/api/accessories/arduino/boards/{board['id']}",
            data={"device": "/dev/ttyUSB1", "ip": "192.168.0.83"},
        )
        entry = response.json()
        assert entry["device"] == "/dev/ttyUSB1"
        assert entry["ip"] == "192.168.0.83"
        # El nombre no se tocó.
        assert entry["name"] == board["name"]

    def test_partial_update_does_not_clear_other_fields(self, client, as_admin):
        board = _add_board(client, as_admin)
        client.put(f"/api/accessories/arduino/boards/{board['id']}", data={"device": "/dev/ttyUSB0"})
        response = client.put(f"/api/accessories/arduino/boards/{board['id']}", data={"name": "Nuevo nombre"})
        entry = response.json()
        assert entry["name"] == "Nuevo nombre"
        assert entry["device"] == "/dev/ttyUSB0"

    def test_unknown_board_404(self, client, as_admin):
        response = client.put("/api/accessories/arduino/boards/no-existe", data={"name": "x"})
        assert response.status_code == 404

    def test_requires_admin(self, client, as_operator):
        response = client.put("/api/accessories/arduino/boards/any", data={"name": "x"})
        assert response.status_code == 403


class TestArduinoBoardsRemove:
    def test_remove_board(self, client, as_admin):
        board = _add_board(client, as_admin)
        response = client.delete(f"/api/accessories/arduino/boards/{board['id']}")
        assert response.status_code == 200
        assert response.json() == {"success": True}
        assert client.get("/api/accessories/arduino/boards").json()["boards"] == []

    def test_unknown_board_404(self, client, as_admin):
        response = client.delete("/api/accessories/arduino/boards/no-existe")
        assert response.status_code == 404

    def test_requires_admin(self, client, as_operator):
        response = client.delete("/api/accessories/arduino/boards/any")
        assert response.status_code == 403

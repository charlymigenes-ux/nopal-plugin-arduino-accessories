"""Transporte WiFi del driver "arduino" (Fase 1 del roadmap de
Automatización de Taller): permite controlar una placa NOPAL por HTTP en
vez de USB-serie, reusando los mismos endpoints que el firmware expone en
setupWebServer() (nopal_accessory.ino). Se prueba con `requests` mockeado
-- no hay una placa real alcanzable por red en este entorno de tests."""

import json

from .conftest import accessory_service


class _FakeResponse:
    def __init__(self, text="OK", status_code=200, json_data=None):
        self.text = text
        self.status_code = status_code
        self._json_data = json_data

    def raise_for_status(self):
        if self.status_code >= 400:
            import requests
            raise requests.exceptions.HTTPError(f"status {self.status_code}")

    def json(self):
        if self._json_data is None:
            raise ValueError("sin cuerpo JSON")
        return self._json_data


WIFI_CONFIG = {
    "transport": "wifi",
    "ip": "192.168.1.50",
    "relay": 1,
    "ota_username": "nopal",
    "ota_password": "secreto",
}


class TestArduinoHttpRequest:
    def test_get_state_uses_http_when_transport_wifi(self, monkeypatch):
        calls = []

        def fake_request(method, url, params=None, auth=None, timeout=None):
            calls.append((method, url, params, auth))
            return _FakeResponse(text="ON")

        monkeypatch.setattr(accessory_service.requests, "request", fake_request)
        result = accessory_service._arduino_get_state(WIFI_CONFIG)

        assert result is True
        assert calls == [("GET", "http://192.168.1.50/api/relay", {"n": 1}, ("nopal", "secreto"))]

    def test_set_state_uses_http_when_transport_wifi(self, monkeypatch):
        calls = []

        def fake_request(method, url, params=None, auth=None, timeout=None):
            calls.append((method, url, params))
            return _FakeResponse(text="OK")

        monkeypatch.setattr(accessory_service.requests, "request", fake_request)
        result = accessory_service._arduino_set_state(WIFI_CONFIG, True)

        assert result is True
        assert calls == [("POST", "http://192.168.1.50/api/relay", {"n": 1, "on": "true"})]

    def test_set_state_off_sends_on_false(self, monkeypatch):
        calls = []
        monkeypatch.setattr(
            accessory_service.requests, "request",
            lambda method, url, params=None, auth=None, timeout=None: calls.append(params) or _FakeResponse("OK"),
        )
        accessory_service._arduino_set_state(WIFI_CONFIG, False)
        assert calls[0]["on"] == "false"

    def test_set_led_uses_http_when_transport_wifi(self, monkeypatch):
        calls = []

        def fake_request(method, url, params=None, auth=None, timeout=None):
            calls.append((method, url, params))
            return _FakeResponse(text="OK")

        monkeypatch.setattr(accessory_service.requests, "request", fake_request)
        led_config = {**WIFI_CONFIG, "led_mode": "ws2812"}
        del led_config["relay"]
        result = accessory_service._arduino_set_led(led_config, 10, 20, 30)

        assert result is True
        assert calls == [("POST", "http://192.168.1.50/api/led", {"mode": "ws2812", "r": 10, "g": 20, "b": 30})]

    def test_set_led_pwm_mode_uses_http_when_transport_wifi(self, monkeypatch):
        """Mismo caso que test_set_led_uses_http_when_transport_wifi pero
        para led_mode="pwm" -- confirma que _arduino_set_led() elige
        mode=pwm (no solo ws2812, ya cubierto arriba) al armar los params
        del POST /api/led."""
        calls = []

        def fake_request(method, url, params=None, auth=None, timeout=None):
            calls.append((method, url, params))
            return _FakeResponse(text="OK")

        monkeypatch.setattr(accessory_service.requests, "request", fake_request)
        led_config = {**WIFI_CONFIG, "led_mode": "pwm"}
        del led_config["relay"]
        result = accessory_service._arduino_set_led(led_config, 5, 6, 7)

        assert result is True
        assert calls == [("POST", "http://192.168.1.50/api/led", {"mode": "pwm", "r": 5, "g": 6, "b": 7})]

    def test_falls_back_to_serial_when_transport_missing(self, monkeypatch):
        """Registros viejos (de antes de esta feature) no tienen
        config["transport"] -- deben seguir yendo por serie, sin romper."""
        calls = []
        monkeypatch.setattr(accessory_service.requests, "request", lambda *a, **k: calls.append(1) or _FakeResponse())
        monkeypatch.setattr(accessory_service, "_arduino_send_command", lambda config, command: "OK")

        result = accessory_service._arduino_set_state({"device": "/dev/ttyUSB0", "relay": 1}, True)

        assert result is True
        assert calls == []

    def test_http_request_returns_none_without_ip(self):
        assert accessory_service._arduino_http_request({}, "GET", "/api/relay") is None

    def test_http_request_returns_none_on_connection_error(self, monkeypatch):
        import requests

        def raise_error(*args, **kwargs):
            raise requests.exceptions.ConnectionError("no llega")

        monkeypatch.setattr(accessory_service.requests, "request", raise_error)
        result = accessory_service._arduino_http_request({"ip": "192.168.1.50"}, "GET", "/api/relay")
        assert result is None

    def test_error_response_from_board_is_returned_as_is(self, monkeypatch):
        """El firmware manda 400 + "ERR:INVALID_RELAY" en texto -- se
        devuelve tal cual, quien llama decide (mismo criterio que serie:
        response == "OK" es la única comparación que importa)."""
        monkeypatch.setattr(
            accessory_service.requests, "request",
            lambda *a, **k: _FakeResponse(text="ERR:INVALID_RELAY", status_code=400),
        )
        result = accessory_service._arduino_set_state(WIFI_CONFIG, True)
        assert result is False


class TestProbeWifiBoard:
    def test_success_returns_capabilities(self, monkeypatch):
        status_json = {
            "role": "accessory",
            "firmware": "1.3",
            "hostname": "nopal-accessory",
            "wifi": {"connected": True},
            "io": {"relays": 4, "pwm_led": True, "ws2812": True, "ws2812_count": 30},
        }
        monkeypatch.setattr(
            accessory_service.requests, "get",
            lambda url, auth=None, timeout=None: _FakeResponse(json_data=status_json),
        )
        board = accessory_service.probe_wifi_board("192.168.1.50", "nopal", "secreto")

        assert board == {
            "ip": "192.168.1.50",
            "firmware": "1.3",
            "hostname": "nopal-accessory",
            "relays": 4,
            "pwm_led": True,
            "ws2812": True,
            "ws2812_count": 30,
            "wifi_connected": True,
        }

    def test_non_nopal_board_returns_none(self, monkeypatch):
        monkeypatch.setattr(
            accessory_service.requests, "get",
            lambda url, auth=None, timeout=None: _FakeResponse(json_data={"role": "printer"}),
        )
        assert accessory_service.probe_wifi_board("192.168.1.50", "u", "p") is None

    def test_v3_dashboard_status_is_normalized_with_telemetry(self, monkeypatch):
        status_json = {
            "role": "accessory",
            "board": "esp32_devkit_v1_30pin",
            "chip": "ESP32-WROOM-32",
            "firmware": "3.0.2",
            "protocol": 3,
            "wifi": {"connected": True, "hostname": "nopal-taller", "ssid": "Taller", "rssi": -58},
            "relays": [{"n": number, "on": number == 1} for number in range(1, 9)],
            "led": {"type": "ws2812", "count": 12, "brightness": 96, "effect": "SOLID", "scene": "READY"},
            "inputs": {"adc_gpio": 34, "a0_raw": 2048, "a0_percent": 50},
            "system": {"uptime_ms": 9000, "free_heap": 217000},
        }
        monkeypatch.setattr(
            accessory_service.requests, "get",
            lambda url, auth=None, timeout=None: _FakeResponse(json_data=status_json),
        )

        board = accessory_service.probe_wifi_board("192.168.1.50", "", "")

        assert board["relays"] == 8
        assert board["ws2812"] is True
        assert board["ws2812_count"] == 12
        assert board["free_heap"] == 217000
        assert board["rssi"] == -58
        assert board["a0_raw"] == 2048
        assert board["scene"] == "READY"

    def test_unreachable_returns_none(self, monkeypatch):
        import requests

        def raise_error(*args, **kwargs):
            raise requests.exceptions.ConnectionError("no llega")

        monkeypatch.setattr(accessory_service.requests, "get", raise_error)
        assert accessory_service.probe_wifi_board("192.168.1.50", "u", "p") is None

    def test_non_json_response_returns_none(self, monkeypatch):
        monkeypatch.setattr(
            accessory_service.requests, "get",
            lambda url, auth=None, timeout=None: _FakeResponse(json_data=None),
        )
        assert accessory_service.probe_wifi_board("192.168.1.50", "u", "p") is None


class TestRegisterAccessoryWifiTransport:
    def test_wifi_requires_ip_not_device(self):
        try:
            accessory_service.register_accessory("Luz", "relay", "arduino", {"transport": "wifi", "relay": 1})
            assert False, "debía rechazar por falta de ip"
        except ValueError as e:
            assert "ip" in str(e)

    def test_wifi_with_ip_succeeds_without_device(self):
        entry = accessory_service.register_accessory(
            "Luz", "relay", "arduino", {"transport": "wifi", "ip": "192.168.1.50", "relay": 1}
        )
        assert entry["config"]["ip"] == "192.168.1.50"

    def test_usb_still_requires_device(self):
        try:
            accessory_service.register_accessory("Luz", "relay", "arduino", {"relay": 1})
            assert False, "debía rechazar por falta de device"
        except ValueError as e:
            assert "device" in str(e)

    def test_ota_password_hidden_in_public_listing(self):
        accessory_service.register_accessory(
            "Luz", "relay", "arduino",
            {"transport": "wifi", "ip": "192.168.1.50", "relay": 1, "ota_password": "secreto"},
        )
        entries = accessory_service.get_accessories()
        assert entries[0]["config"]["ota_password"] == "***"


class TestProbeWifiEndpoint:
    def test_probe_success(self, client, as_admin, monkeypatch):
        status_json = {
            "role": "accessory", "firmware": "1.3", "hostname": "nopal-accessory",
            "wifi": {"connected": True}, "io": {"relays": 2, "pwm_led": False, "ws2812": True, "ws2812_count": 12},
        }
        monkeypatch.setattr(
            accessory_service.requests, "get",
            lambda url, auth=None, timeout=None: _FakeResponse(json_data=status_json),
        )
        response = client.post(
            "/api/accessories/arduino/probe-wifi",
            data={"ip": "192.168.1.50", "username": "nopal", "password": "secreto"},
        )
        assert response.status_code == 200
        assert response.json()["relays"] == 2

    def test_probe_failure_returns_400(self, client, as_admin, monkeypatch):
        import requests as requests_module

        def raise_error(*args, **kwargs):
            raise requests_module.exceptions.ConnectionError("no llega")

        monkeypatch.setattr(accessory_service.requests, "get", raise_error)
        response = client.post(
            "/api/accessories/arduino/probe-wifi",
            data={"ip": "192.168.1.50", "username": "nopal", "password": "secreto"},
        )
        assert response.status_code == 400

    def test_probe_requires_admin(self, client, as_operator):
        response = client.post(
            "/api/accessories/arduino/probe-wifi",
            data={"ip": "192.168.1.50", "username": "nopal", "password": "secreto"},
        )
        assert response.status_code == 403

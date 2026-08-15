from .conftest import accessory_service, board_pinmap_service


class TestGetAmbientTemperatureC:
    async def test_none_sin_placa_elegida(self, monkeypatch):
        monkeypatch.setattr(board_pinmap_service, "get_ambient_sensor_board_id", lambda: None)
        assert await accessory_service.get_ambient_temperature_c() is None

    async def test_none_si_la_placa_elegida_ya_no_existe(self, monkeypatch):
        monkeypatch.setattr(board_pinmap_service, "get_ambient_sensor_board_id", lambda: "board_1")
        monkeypatch.setattr(board_pinmap_service, "list_boards", lambda: [])
        assert await accessory_service.get_ambient_temperature_c() is None

    async def test_devuelve_la_temperatura_si_la_lectura_es_valida(self, monkeypatch):
        board = {"id": "board_1", "ip": "192.168.1.50"}
        monkeypatch.setattr(board_pinmap_service, "get_ambient_sensor_board_id", lambda: "board_1")
        monkeypatch.setattr(board_pinmap_service, "list_boards", lambda: [board])
        monkeypatch.setattr(
            accessory_service, "_probe_configured_board_sync",
            lambda b: {"telemetry": {"dht_valid": True, "dht_temp_c": 24.5}},
        )
        assert await accessory_service.get_ambient_temperature_c() == 24.5

    async def test_none_si_la_lectura_todavia_no_es_valida(self, monkeypatch):
        board = {"id": "board_1", "ip": "192.168.1.50"}
        monkeypatch.setattr(board_pinmap_service, "get_ambient_sensor_board_id", lambda: "board_1")
        monkeypatch.setattr(board_pinmap_service, "list_boards", lambda: [board])
        monkeypatch.setattr(
            accessory_service, "_probe_configured_board_sync",
            lambda b: {"telemetry": {"dht_valid": False}},
        )
        assert await accessory_service.get_ambient_temperature_c() is None

    async def test_none_si_la_placa_no_responde(self, monkeypatch):
        board = {"id": "board_1", "ip": "192.168.1.50"}
        monkeypatch.setattr(board_pinmap_service, "get_ambient_sensor_board_id", lambda: "board_1")
        monkeypatch.setattr(board_pinmap_service, "list_boards", lambda: [board])
        monkeypatch.setattr(
            accessory_service, "_probe_configured_board_sync",
            lambda b: {"telemetry": {}, "online": False},
        )
        assert await accessory_service.get_ambient_temperature_c() is None

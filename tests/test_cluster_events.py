"""Avisos que la placa maestra del clúster le manda a NOPAL.

El endpoint /api/accessories/cluster/event es el único de este plugin sin
sesión (lo llama un ESP32), así que su autenticación por token es lo que
más se prueba acá: un endpoint público mal protegido es peor que no
tenerlo.
"""

from .conftest import cluster_events


class TestToken:
    def test_token_is_generated_once_and_kept(self):
        primero = cluster_events.get_config()["token"]
        assert len(primero) == 32
        # Releer no debe rotarlo: el usuario ya lo copió a un secrets.h.
        assert cluster_events.get_config()["token"] == primero

    def test_rotate_token_invalidates_the_previous_one(self):
        viejo = cluster_events.get_config()["token"]
        nuevo = cluster_events.rotate_token()["token"]
        assert nuevo != viejo
        assert cluster_events.token_is_valid(nuevo)
        assert not cluster_events.token_is_valid(viejo)

    def test_empty_token_is_never_valid(self):
        # Importa porque un token vacío es justo lo que manda una placa mal
        # configurada, y aceptarlo abriría el endpoint a cualquiera.
        cluster_events.get_config()
        assert not cluster_events.token_is_valid("")
        assert not cluster_events.token_is_valid(None)


class TestEventEndpoint:
    RUTA = "/api/accessories/cluster/event"

    def test_rejects_request_without_token(self, client):
        response = client.post(self.RUTA, data={"event": "join", "address": "192.168.0.84"})
        assert response.status_code == 401

    def test_rejects_wrong_token(self, client):
        response = client.post(
            self.RUTA,
            data={"event": "join", "address": "192.168.0.84"},
            headers={"X-NOPAL-Token": "0" * 32},
        )
        assert response.status_code == 401

    def test_accepts_valid_token(self, client):
        token = cluster_events.get_config()["token"]
        response = client.post(
            self.RUTA,
            data={"event": "join", "mac": "AA:BB:CC:DD:EE:FF", "address": "192.168.0.84"},
            headers={"X-NOPAL-Token": token},
        )
        assert response.status_code == 200
        assert response.json()["handled"] is True

    def test_unknown_event_is_rejected_not_ignored(self, client):
        token = cluster_events.get_config()["token"]
        response = client.post(
            self.RUTA,
            data={"event": "explota"},
            headers={"X-NOPAL-Token": token},
        )
        assert response.status_code == 400

    def test_works_without_the_led_matrix_plugin(self, client):
        # La Matriz LED es otro plugin y puede no estar instalada: el aviso
        # tiene que aceptarse igual, solo sin anunciar nada.
        token = cluster_events.get_config()["token"]
        response = client.post(
            self.RUTA,
            data={"event": "join", "address": "192.168.0.84"},
            headers={"X-NOPAL-Token": token},
        )
        assert response.status_code == 200
        assert response.json()["announced"] is False


class TestBoardLabel:
    def test_uses_the_name_the_user_gave_the_board(self, monkeypatch):
        # _board_label importa board_pinmap_service adentro de la función,
        # así que se sustituye list_boards en el módulo ya cargado.
        from .conftest import board_pinmap_service

        monkeypatch.setattr(
            board_pinmap_service, "list_boards",
            lambda: [{"id": "b1", "name": "ESP8266 (8 BARRA)", "ip": "192.168.0.84"}],
        )
        assert cluster_events._board_label("192.168.0.84", None) == "ESP8266 (8 BARRA)"

    def test_unregistered_board_falls_back_to_its_address(self, monkeypatch):
        from .conftest import board_pinmap_service

        monkeypatch.setattr(board_pinmap_service, "list_boards", lambda: [])
        assert cluster_events._board_label("192.168.0.84", "AA:BB") == "192.168.0.84"

    def test_falls_back_to_address_then_mac(self):
        assert cluster_events._board_label("192.168.0.99", "AA:BB") == "192.168.0.99"
        assert cluster_events._board_label(None, "AA:BB") == "AA:BB"

    def test_never_returns_empty(self):
        # Un anuncio en blanco en la matriz no le dice nada a nadie.
        assert cluster_events._board_label(None, None) == "PLACA"


class TestAnnounceToggles:
    def test_disabled_skips_everything(self, client):
        cluster_events.update_config({"enabled": False})
        token = cluster_events.get_config()["token"]
        response = client.post(
            TestEventEndpoint.RUTA,
            data={"event": "join", "address": "192.168.0.84"},
            headers={"X-NOPAL-Token": token},
        )
        assert response.json()["handled"] is False

    def test_invalid_color_is_rejected(self):
        try:
            cluster_events.update_config({"announce_color": "no-es-un-color"})
        except ValueError:
            return
        raise AssertionError("Se aceptó un color inválido")

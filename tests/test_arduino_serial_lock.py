"""Regresión para el bug real reportado en producción: el badge de un
accesorio "arduino" cambiaba en la UI pero el relé físico no respondía.

Causa raíz confirmada contra hardware real (ver notas en
accessory_service._get_arduino_lock): el descubrimiento de placas
(_probe_nopal_board_sync, disparado por el frontend en cada refreshAll(),
incluido justo después de todo power toggle) abría su propia
serial.Serial() sobre el mismo /dev ya usado por la conexión persistente
del driver -- dos lectores compitiendo por los mismos bytes que manda la
placa terminan robándose respuestas entre sí. Este test reproduce esa
concurrencia con un doble de hardware (sin puerto serie real) y confirma
que, con el lock por dispositivo, un comando de encendido/apagado y un
probeo de descubrimiento concurrentes nunca se entreveran."""

import threading
import time

from .conftest import accessory_service


class _FakeBoardSerial:
    """Doble de `serial.Serial` para UNA placa NOPAL: responde según el
    último comando recibido, con una demora artificial entre `write` y
    `readline` para ensanchar la ventana de carrera -- sin el lock por
    puerto, es prácticamente seguro que la escritura del otro hilo se cuele
    ahí en medio."""

    is_open = True

    def __init__(self, events):
        self._events = events
        self._last_command = ""

    def reset_input_buffer(self):
        pass

    def write(self, data):
        self._last_command = data.decode("utf-8", errors="ignore")
        self._events.append(("write", self._last_command))
        # Ensancha la ventana entre escribir y leer -- si algo más pudiera
        # escribir sobre el mismo puerto en este instante (como hacía el
        # probeo de descubrimiento antes del fix), acá es donde pasaría.
        time.sleep(0.05)

    def readline(self):
        command = self._last_command
        self._events.append(("read_for", command))
        if command.startswith("NOPAL:ID?"):
            return (
                b"NOPAL,role=accessory,chip=TEST-CHIP,fw=1.3,relays=4,"
                b"pwm_led=0,ws2812=0\n"
            )
        if command.startswith("NOPAL:R1:ON"):
            return b"OK\n"
        return b"ERR:UNKNOWN_COMMAND\n"


def test_power_command_and_discovery_probe_dont_interleave_on_shared_port():
    device = "/dev/ttyUSB-lock-test"
    events = []
    fake_serial = _FakeBoardSerial(events)

    # Simula un accesorio ya registrado con conexión persistente abierta --
    # el mismo estado que "Luz 1"/"rele ventilador" en producción.
    accessory_service._arduino_connections[device] = fake_serial
    accessory_service._arduino_locks.pop(device, None)

    config = {"device": device, "relay": 1}
    results = {}

    def do_power_on():
        results["power"] = accessory_service._arduino_set_state(config, True)

    def do_discovery_probe():
        # Barrera de arranque en falso para maximizar la chance de que
        # ambos hilos entren a la sección crítica casi al mismo tiempo.
        time.sleep(0.01)
        results["probe"] = accessory_service._probe_nopal_board_sync(device)

    t_power = threading.Thread(target=do_power_on)
    t_probe = threading.Thread(target=do_discovery_probe)
    t_power.start()
    t_probe.start()
    t_power.join(timeout=5)
    t_probe.join(timeout=5)

    # Ambas operaciones tienen que haber visto SU PROPIA respuesta, no la
    # del otro -- si el comando "R1:ON" hubiera recibido la línea de
    # identificación del probeo de descubrimiento (o viceversa), esto falla.
    assert results["power"] is True, (
        "El comando de encendido no recibió su propio \"OK\" -- se "
        "entreveró con el probeo de descubrimiento concurrente sobre el "
        "mismo puerto (el bug reportado en producción)."
    )
    assert results["probe"] is not None
    assert results["probe"]["chip"] == "TEST-CHIP"

    # Cada write tiene que estar inmediatamente seguido por SU PROPIO read
    # (mismo comando) -- ninguna escritura del otro hilo se coló en medio.
    assert len(events) == 4
    for write_event, read_event in zip(events[0::2], events[1::2]):
        assert write_event[0] == "write"
        assert read_event[0] == "read_for"
        assert write_event[1] == read_event[1]

    accessory_service._arduino_connections.pop(device, None)
    accessory_service._arduino_locks.pop(device, None)


def test_discovery_probe_reuses_persistent_connection_without_reopening():
    """El probeo de descubrimiento, cuando ya hay una conexión persistente
    abierta sobre el puerto, tiene que reusarla en vez de abrir una
    serial.Serial() nueva -- abrir una segunda es justo lo que dispara la
    condición de carrera del bug."""
    device = "/dev/ttyUSB-reuse-test"
    events = []
    fake_serial = _FakeBoardSerial(events)
    accessory_service._arduino_connections[device] = fake_serial
    accessory_service._arduino_locks.pop(device, None)

    result = accessory_service._probe_nopal_board_sync(device)

    assert result is not None
    assert result["chip"] == "TEST-CHIP"
    # Si hubiera abierto una conexión nueva, quedaría una segunda entrada o
    # la persistente habría sido reemplazada -- sigue siendo el mismo
    # objeto que pusimos nosotros.
    assert accessory_service._arduino_connections[device] is fake_serial

    accessory_service._arduino_connections.pop(device, None)
    accessory_service._arduino_locks.pop(device, None)

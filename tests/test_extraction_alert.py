from .conftest import accessory_service


def _status(name, on):
    return {"id": "abc", "name": name, "on": on}


def test_reconoce_el_extractor_por_nombre():
    """El nombre real registrado en el taller es "Extractor" (relé de la
    .84). Se compara en minúsculas y por subcadena para que renombrarlo a
    "Extractor taller" o "extractor 2" siga funcionando."""
    status = [_status("Extractor", False), _status("Aro LED", True)]
    result = accessory_service.get_extraction_accessories(status)
    assert [a["name"] for a in result] == ["Extractor"]


def test_no_confunde_otros_accesorios():
    """"lasers" y "Relé AIRE" conviven en las mismas placas; ninguno es
    extracción aunque AIRE suene parecido."""
    status = [_status("lasers", True), _status("Relé AIRE", False), _status("T-800", None)]
    assert accessory_service.get_extraction_accessories(status) == []


def test_tolera_nombre_ausente():
    """_public() devuelve la entrada del registro tal cual; una entrada sin
    "name" no debe reventar el badge de notificaciones entero."""
    status = [{"id": "x", "on": False}, _status(None, False)]
    assert accessory_service.get_extraction_accessories(status) == []


def test_conserva_el_estado_sin_interpretarlo():
    """El filtro NO decide si hay que alertar: devuelve on tal cual (True,
    False o None) y es el core quien alerta solo con False. Si acá se
    colara la interpretación, un None (placa muda) terminaría disparando
    una alerta de seguridad falsa."""
    status = [_status("Extractor A", None), _status("Extractor B", False), _status("Extractor C", True)]
    result = accessory_service.get_extraction_accessories(status)
    assert [a["on"] for a in result] == [None, False, True]


def test_varios_extractores():
    """El taller puede tener más de uno; el aviso los nombra a todos."""
    status = [_status("Extractor 1", False), _status("extractor 2", False), _status("Aro LED", True)]
    assert len(accessory_service.get_extraction_accessories(status)) == 2

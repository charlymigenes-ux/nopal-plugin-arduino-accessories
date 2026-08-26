"""Fixtures para los tests de este plugin.

Este plugin corre EN PROCESO con NOPAL (no está sandboxeado -- ver el
docstring de backend/router.py) y su router usa `backend.auth_deps` de
NOPAL core en tiempo de ejecución (import absoluto e intencional). Para
correr estos tests hace falta un checkout de NOPAL core accesible:

- Por convención, este repo se clona dentro de plugins/arduino-accessories/
  de ese checkout (ver plugin_installer_service.py de NOPAL core), en cuyo
  caso NOPAL core está 2 niveles arriba de esta carpeta de tests/.
- Si se corre desde otro lado, seteá la variable de entorno
  NOPAL_CORE_ROOT apuntando al checkout de NOPAL.

Carga backend/router.py de este mismo plugin con la misma técnica que usa
backend/services/plugin_loader_service.py de NOPAL core (duplicada acá,
self-contained, para no depender de su layout interno) -- así los tests
ejercitan el router exactamente como se carga en producción.
"""

import importlib.util
import os
import sys
import types
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.middleware.sessions import SessionMiddleware

PLUGIN_ROOT = Path(__file__).resolve().parents[1]
NOPAL_CORE_ROOT = Path(os.environ.get("NOPAL_CORE_ROOT") or PLUGIN_ROOT.parents[1])
core_path = str(NOPAL_CORE_ROOT)
# pytest agrega primero la raíz del plugin; como ambos proyectos tienen un
# paquete llamado ``backend``, eso podía resolver el backend del plugin en
# vez del core aun con NOPAL_CORE_ROOT correcto. La raíz explícita del core
# debe quedar al frente, no sólo estar presente en algún lugar de sys.path.
if core_path in sys.path:
    sys.path.remove(core_path)
sys.path.insert(0, core_path)

try:
    from backend.auth_deps import require_auth
except ImportError as e:
    raise RuntimeError(
        "No se pudo importar backend.auth_deps de NOPAL core. Este plugin no es "
        "standalone (corre en proceso con NOPAL) -- corré estos tests desde un "
        "checkout de NOPAL con este repo en plugins/arduino-accessories/, o seteá "
        "NOPAL_CORE_ROOT apuntando a uno."
    ) from e

ADMIN_USER = {"id": "test-admin", "username": "test-admin", "role": "admin"}
OPERATOR_USER = {"id": "test-operator", "username": "test-operator", "role": "operator"}

_NAMESPACE = "nopal_plugin_test_arduino_accessories"


def _load_router():
    if _NAMESPACE not in sys.modules:
        ns_module = types.ModuleType(_NAMESPACE)
        ns_module.__path__ = []
        sys.modules[_NAMESPACE] = ns_module

    backend_dir = PLUGIN_ROOT / "backend"
    pkg_name = f"{_NAMESPACE}.pkg"
    pkg_spec = importlib.util.spec_from_file_location(
        pkg_name, backend_dir / "__init__.py", submodule_search_locations=[str(backend_dir)],
    )
    pkg_module = importlib.util.module_from_spec(pkg_spec)
    sys.modules[pkg_name] = pkg_module
    pkg_spec.loader.exec_module(pkg_module)

    module_name = f"{pkg_name}.router"
    module_spec = importlib.util.spec_from_file_location(module_name, backend_dir / "router.py")
    module = importlib.util.module_from_spec(module_spec)
    module.__package__ = pkg_name
    sys.modules[module_name] = module
    module_spec.loader.exec_module(module)
    return module


_ROUTER_MODULE = _load_router()
accessory_service = sys.modules[f"{_NAMESPACE}.pkg.services.accessory_service"]
accessory_scenes = sys.modules[f"{_NAMESPACE}.pkg.services.accessory_scenes"]
activity_log = sys.modules[f"{_NAMESPACE}.pkg.services.activity_log"]
firmware_flash_service = sys.modules[f"{_NAMESPACE}.pkg.services.firmware_flash_service"]
board_pinmap_service = sys.modules[f"{_NAMESPACE}.pkg.services.board_pinmap_service"]
machine_led_automation = sys.modules[f"{_NAMESPACE}.pkg.services.machine_led_automation"]
cluster_events = sys.modules[f"{_NAMESPACE}.pkg.services.cluster_events"]


@pytest.fixture(scope="session")
def app():
    fastapi_app = FastAPI()
    fastapi_app.include_router(_ROUTER_MODULE.router)
    # require_auth (backend.auth_deps de NOPAL core) usa request.session --
    # sin este middleware, un pedido SIN as_admin/as_operator no llega a
    # devolver 401 limpio, revienta con AssertionError (mismo middleware
    # que ya instala backend/main.py en producción).
    fastapi_app.add_middleware(SessionMiddleware, secret_key="test-secret")
    return fastapi_app


@pytest.fixture(scope="session")
def client(app):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def as_admin(app):
    """`require_role("admin")` arma una closure nueva por endpoint (no hay
    caching en backend.auth_deps de NOPAL core) -- overridear solo
    `require_auth` alcanza porque esa closure depende de él vía
    `Depends(require_auth)` y FastAPI resuelve overrides de forma
    recursiva, sin importar cuántas instancias distintas de la closure
    externa existan."""
    app.dependency_overrides[require_auth] = lambda: ADMIN_USER
    yield ADMIN_USER
    app.dependency_overrides.pop(require_auth, None)


@pytest.fixture
def as_operator(app):
    app.dependency_overrides[require_auth] = lambda: OPERATOR_USER
    yield OPERATOR_USER
    app.dependency_overrides.pop(require_auth, None)


@pytest.fixture(autouse=True)
def isolated_registries(tmp_path, monkeypatch):
    """Aísla todos los archivos planos de este plugin a un directorio
    temporal por test -- mismo criterio que NOPAL core: nunca tocar los
    archivos reales del checkout donde se corran los tests."""
    monkeypatch.setattr(accessory_service, "REGISTRY_PATH", str(tmp_path / "accessory_registry.json"))
    monkeypatch.setattr(accessory_scenes, "SCENES_PATH", tmp_path / "scenes.json")
    monkeypatch.setattr(activity_log, "LOG_PATH", tmp_path / "activity_log.json")
    monkeypatch.setattr(firmware_flash_service, "BUILDS_DIR", tmp_path / "builds")
    monkeypatch.setattr(board_pinmap_service, "BOARDS_CONFIG_PATH", str(tmp_path / "arduino_boards_config.json"))
    monkeypatch.setattr(machine_led_automation, "CONFIG_PATH", tmp_path / "machine_led_rules.json")
    # Sin esto, get_config() de cluster_events generaría un token y lo
    # escribiría en el data/ real del checkout la primera vez que un test
    # toque un endpoint de clúster.
    monkeypatch.setattr(cluster_events, "CONFIG_PATH", tmp_path / "cluster_events.json")
    machine_led_automation._last_applied_state.clear()
    yield tmp_path

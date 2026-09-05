"""Backend regression tests for /api/tipos and /api/molds endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback: read from frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

ADMIN_PASSWORD = "admin2026"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/admin/verify", json={"password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("ok") is True
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Tipos CRUD ----------
class TestTiposCRUD:
    TEST_TIPO = "TEST_TIPO_NEW"
    TEST_TIPO_RENAMED = "TEST_TIPO_RENAMED"

    def test_list_tipos_ok(self):
        r = requests.get(f"{BASE_URL}/api/tipos")
        assert r.status_code == 200
        assert isinstance(r.json().get("items"), list)

    def test_create_tipo(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/tipos", json={"name": self.TEST_TIPO}, headers=auth_headers)
        assert r.status_code == 200, r.text
        assert r.json().get("name") == self.TEST_TIPO
        # Verify via GET
        r2 = requests.get(f"{BASE_URL}/api/tipos")
        assert self.TEST_TIPO in r2.json().get("items", [])

    def test_rename_tipo(self, auth_headers):
        r = requests.put(
            f"{BASE_URL}/api/tipos/{self.TEST_TIPO}",
            json={"name": self.TEST_TIPO_RENAMED},
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("name") == self.TEST_TIPO_RENAMED
        r2 = requests.get(f"{BASE_URL}/api/tipos")
        items = r2.json().get("items", [])
        assert self.TEST_TIPO_RENAMED in items
        assert self.TEST_TIPO not in items

    def test_delete_tipo(self, auth_headers):
        r = requests.delete(f"{BASE_URL}/api/tipos/{self.TEST_TIPO_RENAMED}", headers=auth_headers)
        assert r.status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/tipos")
        assert self.TEST_TIPO_RENAMED not in r2.json().get("items", [])


# ---------- Molds CRUD ----------
class TestMoldsCRUD:
    TEST_MOLD = "TEST_MOLD_NEW"
    TEST_TIPO_FOR_MOLD = "TEST_TIPO_FOR_MOLD"

    @pytest.fixture(autouse=True)
    def setup_tipo(self, auth_headers):
        requests.post(f"{BASE_URL}/api/tipos", json={"name": self.TEST_TIPO_FOR_MOLD}, headers=auth_headers)
        yield
        # cleanup happens at delete_mold test

    def test_list_molds_ok(self):
        r = requests.get(f"{BASE_URL}/api/molds")
        assert r.status_code == 200
        items = r.json().get("items")
        assert isinstance(items, list)
        # Ensure existing production molds present (M-01 etc.), not empty
        assert len(items) > 0

    def test_create_mold(self, auth_headers):
        payload = {
            "name": self.TEST_MOLD,
            "tipo": self.TEST_TIPO_FOR_MOLD,
            "color": "#FF6600",
            "ancho": 1.5,
            "alto": 2.0,
        }
        r = requests.post(f"{BASE_URL}/api/molds", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == self.TEST_MOLD
        assert data["tipo"] == self.TEST_TIPO_FOR_MOLD
        assert data["color"].lower() == "#ff6600"
        assert float(data["ancho"]) == 1.5
        assert float(data["alto"]) == 2.0

    def test_get_verifies_persistence(self):
        r = requests.get(f"{BASE_URL}/api/molds")
        found = next((m for m in r.json()["items"] if m["name"] == self.TEST_MOLD), None)
        assert found is not None
        assert float(found["ancho"]) == 1.5
        assert float(found["alto"]) == 2.0

    def test_update_mold(self, auth_headers):
        payload = {
            "name": self.TEST_MOLD,
            "tipo": self.TEST_TIPO_FOR_MOLD,
            "color": "#00AA55",
            "ancho": 2.5,
            "alto": 3.0,
        }
        r = requests.post(f"{BASE_URL}/api/molds", json=payload, headers=auth_headers)
        assert r.status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/molds")
        found = next((m for m in r2.json()["items"] if m["name"] == self.TEST_MOLD), None)
        assert found is not None
        assert float(found["ancho"]) == 2.5
        assert found["color"].lower() == "#00aa55"

    def test_delete_mold(self, auth_headers):
        r = requests.delete(f"{BASE_URL}/api/molds/{self.TEST_MOLD}", headers=auth_headers)
        assert r.status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/molds")
        names = [m["name"] for m in r2.json()["items"]]
        assert self.TEST_MOLD not in names
        # cleanup tipo
        requests.delete(f"{BASE_URL}/api/tipos/{self.TEST_TIPO_FOR_MOLD}", headers=auth_headers)


# ---------- Auth guard ----------
class TestAuthGuards:
    def test_create_tipo_without_auth(self):
        r = requests.post(f"{BASE_URL}/api/tipos", json={"name": "TEST_UNAUTH"})
        assert r.status_code in (401, 403)

    def test_create_mold_without_auth(self):
        r = requests.post(f"{BASE_URL}/api/molds", json={"name": "TEST_UNAUTH_MOLD", "tipo": "Curvo"})
        assert r.status_code in (401, 403)

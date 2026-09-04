"""Backend tests for the mold-based tagging system (pivot from status-based)."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bim-progress-hub.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"
ADMIN_PASSWORD = "admin2026"

TEST_MOLD_NAME = "TEST_M_MOLD_A"
TEST_MOLD_NAME_2 = "TEST_M_MOLD_B"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/admin/verify", json={"password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("ok") is True
    assert data.get("token")
    return data["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def sample_object_names():
    r = requests.get(f"{API}/objects", params={"limit": 5}, timeout=15)
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 3
    return [it["name"] for it in items[:3]]


# --- Admin auth ---
class TestAdminAuth:
    def test_verify_bad_password(self):
        r = requests.post(f"{API}/admin/verify", json={"password": "wrong"}, timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is False

    def test_require_admin_on_write(self):
        r = requests.put(f"{API}/tags", json={"object_name": "x"}, timeout=10)
        assert r.status_code == 401


# --- Molds catalog ---
class TestMolds:
    def test_list_molds(self):
        r = requests.get(f"{API}/molds", timeout=10)
        assert r.status_code == 200
        assert "items" in r.json()

    def test_create_mold(self, admin_headers):
        r = requests.post(f"{API}/molds", json={
            "name": TEST_MOLD_NAME, "tipo": "curvo", "color": "#FF0000"
        }, headers=admin_headers, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == TEST_MOLD_NAME
        assert d["tipo"] == "curvo"
        assert d["color"] == "#FF0000"
        # Verify persistence
        r2 = requests.get(f"{API}/molds", timeout=10)
        names = [m["name"] for m in r2.json()["items"]]
        assert TEST_MOLD_NAME in names

    def test_create_mold_invalid_tipo(self, admin_headers):
        r = requests.post(f"{API}/molds", json={
            "name": "TEST_BAD", "tipo": "invalid_tipo", "color": "#000000"
        }, headers=admin_headers, timeout=10)
        assert r.status_code == 422

    def test_create_second_mold(self, admin_headers):
        r = requests.post(f"{API}/molds", json={
            "name": TEST_MOLD_NAME_2, "tipo": "liso", "color": "#00FF00"
        }, headers=admin_headers, timeout=10)
        assert r.status_code == 200


# --- Tags ---
class TestTags:
    def test_upsert_tag_with_mold(self, admin_headers, sample_object_names):
        name = sample_object_names[0]
        payload = {
            "object_name": name,
            "molde": TEST_MOLD_NAME,
            "ancho": 1.2,
            "alto": 2.5,
            "color": "Blanco Hueso",
            "notas": "prueba",
            "photo": None,
        }
        r = requests.put(f"{API}/tags", json=payload, headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["molde"] == TEST_MOLD_NAME
        assert d["ancho"] == 1.2
        assert d["alto"] == 2.5
        assert d["color"] == "Blanco Hueso"
        assert d["notas"] == "prueba"
        assert len(d["history"]) >= 1

        # GET verifies persistence and enriched mold info
        g = requests.get(f"{API}/object", params={"name": name}, timeout=10)
        assert g.status_code == 200
        gd = g.json()
        assert gd["molde"] == TEST_MOLD_NAME
        assert gd["tipo"] == "curvo"
        assert gd["color_molde"] == "#FF0000"
        assert gd["ancho"] == 1.2

    def test_history_appended_on_change(self, admin_headers, sample_object_names):
        name = sample_object_names[0]
        payload = {
            "object_name": name, "molde": TEST_MOLD_NAME, "ancho": 1.5, "alto": 2.5,
            "color": "Gris", "notas": "actualizado", "photo": None,
        }
        r = requests.put(f"{API}/tags", json=payload, headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert len(r.json()["history"]) >= 2

    def test_bulk_tag(self, admin_headers, sample_object_names):
        names = sample_object_names[1:3]
        payload = {
            "object_names": names, "molde": TEST_MOLD_NAME_2,
            "ancho": 0.8, "alto": 1.6, "color": "Negro", "notas": "bulk", "photo": None,
        }
        r = requests.put(f"{API}/tags/bulk", json=payload, headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["updated"] == len(names)
        for n in names:
            g = requests.get(f"{API}/object", params={"name": n}, timeout=10)
            assert g.json()["molde"] == TEST_MOLD_NAME_2

    def test_objects_filter_by_molde(self, sample_object_names):
        r = requests.get(f"{API}/objects", params={"molde": TEST_MOLD_NAME, "limit": 200}, timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 1
        for it in items:
            assert it["molde"] == TEST_MOLD_NAME

    def test_objects_filter_sin_molde(self):
        r = requests.get(f"{API}/objects", params={"molde": "none", "limit": 5}, timeout=15)
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert it["molde"] is None

    def test_tags_summary_endpoint(self):
        r = requests.get(f"{API}/tags", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, dict)

    def test_delete_tag(self, admin_headers, sample_object_names):
        name = sample_object_names[0]
        r = requests.delete(f"{API}/tags", params={"object_name": name}, headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert r.json()["deleted"] is True
        g = requests.get(f"{API}/object", params={"name": name}, timeout=10)
        assert g.json()["molde"] is None


# --- Report ---
class TestReport:
    def test_report_all(self):
        r = requests.get(f"{API}/report/molds", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("total", "con_molde", "sin_molde", "items", "resumen"):
            assert k in d
        assert d["total"] == d["con_molde"] + d["sin_molde"]

    def test_report_facade_filter(self):
        r = requests.get(f"{API}/report/molds", params={"facade": "norte"}, timeout=15)
        assert r.status_code == 200

    def test_report_facade_invalid(self):
        r = requests.get(f"{API}/report/molds", params={"facade": "bogus"}, timeout=10)
        assert r.status_code == 422

    def test_export_pdf(self):
        r = requests.get(f"{API}/report/molds/export", params={"format": "pdf"}, timeout=30)
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("application/pdf")
        assert r.content[:4] == b"%PDF"

    def test_export_xlsx(self):
        r = requests.get(f"{API}/report/molds/export", params={"format": "xlsx"}, timeout=30)
        assert r.status_code == 200
        assert "spreadsheetml" in r.headers["content-type"]
        assert r.content[:2] == b"PK"

    def test_export_bad_format(self):
        r = requests.get(f"{API}/report/molds/export", params={"format": "docx"}, timeout=10)
        assert r.status_code == 422


# --- Photos ---
class TestPhotos:
    def test_list_photos(self):
        r = requests.get(f"{API}/photos", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "total" in d


# --- Cleanup ---
def test_zzz_cleanup(admin_headers):
    for mn in [TEST_MOLD_NAME, TEST_MOLD_NAME_2]:
        requests.delete(f"{API}/molds/{mn}", headers=admin_headers, timeout=10)

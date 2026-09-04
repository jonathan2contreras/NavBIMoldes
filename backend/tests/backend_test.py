"""Backend API tests for BIMTracker Web."""
import os
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bim-progress-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Frontend env is not populated in backend container, use production URL from FE env
FE_ENV_PATH = "/app/frontend/.env"
if os.path.exists(FE_ENV_PATH):
    with open(FE_ENV_PATH) as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ---- Root / health ----
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    d = r.json()
    assert d["objects"] == 12275
    assert d["message"] == "BIMTracker API"


# ---- Admin verify ----
def test_admin_verify_ok(s):
    r = s.post(f"{API}/admin/verify", json={"password": "admin2026"})
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_admin_verify_bad(s):
    r = s.post(f"{API}/admin/verify", json={"password": "wrong"})
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is False
    assert "incorrecta" in d["message"].lower()


# ---- Viewer HTML ----
def test_viewer_html(s):
    r = s.get(f"{API}/viewer")
    assert r.status_code == 200
    assert "text/html" in r.headers.get("content-type", "")


# ---- Objects list ----
def test_objects_default(s):
    r = s.get(f"{API}/objects")
    assert r.status_code == 200
    d = r.json()
    assert "total" in d and "items" in d
    assert d["total"] > 0
    assert len(d["items"]) <= 50


def test_objects_search(s):
    r = s.get(f"{API}/objects", params={"search": "C1", "limit": 20})
    assert r.status_code == 200
    d = r.json()
    for it in d["items"]:
        assert "c1" in it["name"].lower()


def test_objects_facade_filter(s):
    r = s.get(f"{API}/objects", params={"facade": "norte", "limit": 5})
    assert r.status_code == 200
    for it in r.json()["items"]:
        assert it["facade"] == "norte"


def test_objects_pagination(s):
    r1 = s.get(f"{API}/objects", params={"skip": 0, "limit": 10}).json()
    r2 = s.get(f"{API}/objects", params={"skip": 10, "limit": 10}).json()
    assert r1["items"] and r2["items"]
    assert r1["items"][0]["name"] != r2["items"][0]["name"]


def test_objects_limit_cap(s):
    r = s.get(f"{API}/objects", params={"limit": 500})
    # le=200 → FastAPI returns 422
    assert r.status_code == 422


# ---- Get object ----
def test_object_lookup(s):
    first = s.get(f"{API}/objects", params={"limit": 1}).json()["items"][0]
    r = s.get(f"{API}/object", params={"name": first["name"]})
    assert r.status_code == 200
    d = r.json()
    assert d["name"] == first["name"]
    assert "history" in d and "observations" in d


def test_object_404(s):
    r = s.get(f"{API}/object", params={"name": "NON_EXISTENT_XYZ"})
    assert r.status_code == 404


# ---- Stats ----
def test_stats(s):
    r = s.get(f"{API}/stats")
    assert r.status_code == 200
    d = r.json()
    assert d["total"] == 533
    assert set(d["por_fachada"].keys()) == {"norte", "sur", "este", "oeste"}
    assert set(d["counts"].keys()) >= {"fabricado", "enviado", "instalado", "entregable", "observaciones"}


# ---- Tags CRUD upsert & history ----
TEST_OBJ = None


def _pick_facade_obj(s):
    r = s.get(f"{API}/objects", params={"facade": "norte", "limit": 1}).json()
    if r["items"]:
        return r["items"][0]["name"]
    return s.get(f"{API}/objects", params={"limit": 1}).json()["items"][0]["name"]


def test_tag_create_and_persist(s):
    global TEST_OBJ
    TEST_OBJ = _pick_facade_obj(s)
    # cleanup pre-existing
    s.put(f"{API}/tags", json={"object_name": TEST_OBJ, "status": None, "observation": ""})
    # create
    r = s.put(f"{API}/tags", json={"object_name": TEST_OBJ, "status": "fabricado", "observation": "TEST_note1"})
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "fabricado"
    assert d["observation"] == "TEST_note1"
    assert len(d["history"]) >= 1
    assert d["history"][-1]["status"] == "fabricado"
    # verify via GET
    g = s.get(f"{API}/object", params={"name": TEST_OBJ}).json()
    assert g["status"] == "fabricado"
    assert g["observation"] == "TEST_note1"


def test_tag_update_status_appends_history(s):
    r = s.put(f"{API}/tags", json={"object_name": TEST_OBJ, "status": "instalado", "observation": "TEST_note2"})
    d = r.json()
    assert d["status"] == "instalado"
    statuses = [h["status"] for h in d["history"]]
    assert "fabricado" in statuses and "instalado" in statuses
    assert len(d["observations"]) >= 2


def test_tag_invalid_status(s):
    r = s.put(f"{API}/tags", json={"object_name": TEST_OBJ, "status": "bogus", "observation": ""})
    assert r.status_code == 422


def test_tag_invalid_object(s):
    r = s.put(f"{API}/tags", json={"object_name": "NON_EXISTENT_XYZ", "status": "fabricado"})
    assert r.status_code == 404


def test_tags_map_contains_test_obj(s):
    r = s.get(f"{API}/tags")
    assert r.status_code == 200
    assert TEST_OBJ in r.json()


def test_tag_clear_keeps_observations(s):
    # clearing status without new obs; since obs history exists, it should NOT delete
    r = s.put(f"{API}/tags", json={"object_name": TEST_OBJ, "status": None, "observation": ""})
    assert r.status_code == 200
    g = s.get(f"{API}/object", params={"name": TEST_OBJ}).json()
    assert g["status"] is None
    assert len(g["observations"]) >= 2  # preserved


# ---- Report ----
def test_report_all(s):
    r = s.get(f"{API}/report", params={"status": "all", "facade": "all"})
    assert r.status_code == 200
    d = r.json()
    assert "total" in d and "items" in d and "counts" in d


def test_report_invalid_status(s):
    r = s.get(f"{API}/report", params={"status": "bogus"})
    assert r.status_code == 422


def test_report_date_filter(s):
    today = datetime.now(timezone.utc).date().isoformat()
    r = s.get(f"{API}/report", params={"from": today, "to": today})
    assert r.status_code == 200


# ---- Export ----
def test_export_pdf(s):
    r = s.get(f"{API}/report/export", params={"format": "pdf"})
    assert r.status_code == 200
    assert r.headers.get("content-type") == "application/pdf"
    assert "attachment" in r.headers.get("content-disposition", "").lower()
    assert r.content[:4] == b"%PDF"


def test_export_xlsx(s):
    r = s.get(f"{API}/report/export", params={"format": "xlsx"})
    assert r.status_code == 200
    assert "attachment" in r.headers.get("content-disposition", "").lower()
    assert r.content[:2] == b"PK"  # xlsx zip magic


def test_export_invalid(s):
    r = s.get(f"{API}/report/export", params={"format": "csv"})
    assert r.status_code == 422


# ---- Cleanup ----
def test_cleanup_final(s):
    """Best-effort cleanup: our TEST_OBJ has observation history so the doc stays,
    but observation notes prefix 'TEST_' identify them. Leave for now (deletion would
    also erase status history)."""
    # Ensure status remains cleared
    g = s.get(f"{API}/object", params={"name": TEST_OBJ}).json()
    assert g["status"] is None

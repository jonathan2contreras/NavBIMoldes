"""
Tests for iteration 8: tipos catalog CRUD + cascade, mold ancho/alto,
tag schema simplification (no ancho/alto/color on tag), report join.
"""
import os
import uuid
import requests
import pytest

def _load_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"
ADMIN_PASSWORD = "admin2026"

DEFAULT_TIPOS = {"Curvo", "Liso", "Borde de losa", "Cubre viga"}


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/admin/verify", json={"password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    tok = r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def created(auth):
    """Track and cleanup created tipos and molds."""
    state = {"tipos": set(), "molds": set()}
    yield state
    for m in state["molds"]:
        requests.delete(f"{API}/molds/{m}", headers=auth)
    for t in state["tipos"]:
        requests.delete(f"{API}/tipos/{t}", headers=auth)


# ---------- TIPOS ----------

class TestTipos:
    def test_list_seeded(self):
        r = requests.get(f"{API}/tipos")
        assert r.status_code == 200
        items = set(r.json()["items"])
        assert DEFAULT_TIPOS.issubset(items), f"missing seeded tipos: {DEFAULT_TIPOS - items}"

    def test_create_requires_admin(self):
        r = requests.post(f"{API}/tipos", json={"name": "TEST_NoAuth"})
        assert r.status_code in (401, 403)

    def test_create_tipo(self, auth, created):
        name = f"TEST_TIPO_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/tipos", json={"name": name}, headers=auth)
        assert r.status_code == 200
        assert r.json()["name"] == name
        created["tipos"].add(name)
        # verify via GET
        items = requests.get(f"{API}/tipos").json()["items"]
        assert name in items

    def test_rename_cascades_to_molds(self, auth, created):
        # Create tipo + mold using it
        t1 = f"TEST_TIPO_{uuid.uuid4().hex[:6]}"
        requests.post(f"{API}/tipos", json={"name": t1}, headers=auth).raise_for_status()
        created["tipos"].add(t1)
        mold_name = f"TEST_M_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/molds", json={
            "name": mold_name, "tipo": t1, "color": "#112233",
            "ancho": 1.5, "alto": 3.0,
        }, headers=auth)
        assert r.status_code == 200, r.text
        created["molds"].add(mold_name)

        # Rename tipo
        t2 = t1 + "_R"
        r = requests.put(f"{API}/tipos/{t1}", json={"name": t2}, headers=auth)
        assert r.status_code == 200
        created["tipos"].discard(t1)
        created["tipos"].add(t2)

        # Mold now has new tipo
        molds = requests.get(f"{API}/molds").json()["items"]
        found = next(m for m in molds if m["name"] == mold_name)
        assert found["tipo"] == t2

    def test_delete_cascade_nulls_mold_tipo(self, auth, created):
        t = f"TEST_TIPO_{uuid.uuid4().hex[:6]}"
        requests.post(f"{API}/tipos", json={"name": t}, headers=auth).raise_for_status()
        created["tipos"].add(t)
        mold_name = f"TEST_M_{uuid.uuid4().hex[:6]}"
        requests.post(f"{API}/molds", json={
            "name": mold_name, "tipo": t, "color": "#445566",
            "ancho": 2.0, "alto": 4.0,
        }, headers=auth).raise_for_status()
        created["molds"].add(mold_name)

        r = requests.delete(f"{API}/tipos/{t}", headers=auth)
        assert r.status_code == 200
        created["tipos"].discard(t)

        molds = requests.get(f"{API}/molds").json()["items"]
        found = next(m for m in molds if m["name"] == mold_name)
        assert found["tipo"] is None


# ---------- MOLDS ancho/alto ----------

class TestMoldAnchoAlto:
    def test_create_mold_with_medidas(self, auth, created):
        # Use a seeded tipo
        mold_name = f"TEST_M_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/molds", json={
            "name": mold_name, "tipo": "Curvo", "color": "#abcdef",
            "ancho": 1.5, "alto": 3.0,
        }, headers=auth)
        assert r.status_code == 200
        body = r.json()
        assert body["ancho"] == 1.5 and body["alto"] == 3.0
        created["molds"].add(mold_name)

        items = requests.get(f"{API}/molds").json()["items"]
        found = next(m for m in items if m["name"] == mold_name)
        assert found["ancho"] == 1.5
        assert found["alto"] == 3.0
        assert found["color"] == "#abcdef"

    def test_reject_invalid_tipo(self, auth):
        r = requests.post(f"{API}/molds", json={
            "name": f"TEST_BAD_{uuid.uuid4().hex[:6]}",
            "tipo": "DOES_NOT_EXIST_XYZ",
            "color": "#000000",
            "ancho": 1.0, "alto": 1.0,
        }, headers=auth)
        assert r.status_code == 422


# ---------- TAGS (no more ancho/alto/color) ----------

class TestTagSimplifiedSchema:
    @pytest.fixture(scope="class")
    def mold_for_tag(self, auth):
        name = f"TEST_M_{uuid.uuid4().hex[:6]}"
        requests.post(f"{API}/molds", json={
            "name": name, "tipo": "Liso", "color": "#00ff00",
            "ancho": 2.5, "alto": 5.0,
        }, headers=auth).raise_for_status()
        yield name
        requests.delete(f"{API}/molds/{name}", headers=auth)

    def _pick_object(self):
        # Get any object name from /api/objects
        r = requests.get(f"{API}/objects")
        assert r.status_code == 200
        objs = r.json().get("items") or r.json().get("objects") or []
        assert objs, "No objects available for tagging"
        # Some endpoints return list of strings, others list of dicts
        first = objs[0]
        return first if isinstance(first, str) else first.get("name")

    def test_put_tag_only_accepts_molde_notas_photo(self, auth, mold_for_tag):
        obj = self._pick_object()
        # send extra fields; they should be ignored (Pydantic by default ignores)
        r = requests.put(f"{API}/tags", json={
            "object_name": obj,
            "molde": mold_for_tag,
            "notas": "TEST_notas",
            "photo": None,
            # legacy fields - must NOT be persisted
            "ancho": 99.9, "alto": 88.8, "color": "#ff0000",
        }, headers=auth)
        assert r.status_code in (200, 201), r.text

        # GET /api/object?name=... returns ancho/alto/color_molde sourced from mold
        r = requests.get(f"{API}/object", params={"name": obj})
        assert r.status_code == 200
        body = r.json()
        assert body.get("molde") == mold_for_tag
        assert body.get("ancho") == 2.5
        assert body.get("alto") == 5.0
        assert body.get("color_molde") == "#00ff00"
        # Legacy fields must not appear on tag
        assert "color" not in body or body.get("color") is None or body.get("color") == "#00ff00"
        assert body.get("notas") == "TEST_notas"

    def test_bulk_tag_simplified(self, auth, mold_for_tag):
        r = requests.get(f"{API}/objects")
        objs = r.json().get("items") or r.json().get("objects") or []
        names = [o if isinstance(o, str) else o["name"] for o in objs[:2]]
        assert len(names) >= 2
        r = requests.put(f"{API}/tags/bulk", json={
            "object_names": names,
            "molde": mold_for_tag,
            "notas": "TEST_bulk",
            "photo": None,
            "ancho": 1.0, "alto": 1.0, "color": "#ffffff",  # should be ignored
        }, headers=auth)
        assert r.status_code in (200, 201), r.text
        for n in names:
            body = requests.get(f"{API}/object", params={"name": n}).json()
            assert body.get("molde") == mold_for_tag
            assert body.get("ancho") == 2.5
            assert body.get("alto") == 5.0


# ---------- REPORTS ----------

class TestMoldsReport:
    def test_report_json(self):
        r = requests.get(f"{API}/report/molds")
        assert r.status_code == 200
        body = r.json()
        items = body.get("items") or []
        # If any item has a mold, verify medidas/color come from mold
        for it in items:
            if it.get("molde"):
                # These keys must be present (from mold join)
                assert "ancho" in it and "alto" in it
                # No paint color field
                assert "color_pintura" not in it

    def test_report_pdf(self):
        r = requests.get(f"{API}/report/molds/export", params={"format": "pdf"})
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert len(r.content) > 500

    def test_report_xlsx(self):
        r = requests.get(f"{API}/report/molds/export", params={"format": "xlsx"})
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "spreadsheet" in ct or "octet-stream" in ct
        assert len(r.content) > 500

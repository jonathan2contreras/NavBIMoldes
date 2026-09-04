"""P0 write-protection, P1 PDF with photos, P2 gallery are covered here (backend side)."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bim-progress-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_PWD = "admin2026"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/admin/verify", json={"password": ADMIN_PWD}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("ok") is True
    tok = data.get("token")
    assert isinstance(tok, str) and len(tok) > 20
    return tok


@pytest.fixture(scope="module")
def sample_object_name():
    r = requests.get(f"{API}/objects", params={"limit": 1}, timeout=30)
    assert r.status_code == 200
    items = r.json().get("items", [])
    assert items, "no objects available"
    return items[0]["name"]


# ---------- P0: unauthenticated writes must be 401 ----------

class TestWriteProtection:
    def test_put_tags_no_auth(self, sample_object_name):
        r = requests.put(f"{API}/tags", json={"object_name": sample_object_name, "status": "fabricado"}, timeout=30)
        assert r.status_code == 401

    def test_post_upload_no_auth(self):
        files = {"file": ("t.jpg", b"\xff\xd8\xff\xd9", "image/jpeg")}
        r = requests.post(f"{API}/upload", files=files, timeout=30)
        assert r.status_code == 401

    def test_delete_photos_no_auth(self):
        r = requests.delete(f"{API}/photos", params={"object_name": "x", "photo": "y"}, timeout=30)
        assert r.status_code == 401

    def test_post_facades_no_auth(self):
        r = requests.post(f"{API}/facades", json={"facades": {}}, timeout=30)
        assert r.status_code == 401

    def test_post_dims_no_auth(self):
        r = requests.post(f"{API}/dims", json={"dims": {}}, timeout=30)
        assert r.status_code == 401

    def test_put_tags_bad_token(self, sample_object_name):
        r = requests.put(
            f"{API}/tags",
            json={"object_name": sample_object_name, "status": "fabricado"},
            headers={"Authorization": "Bearer garbage.not.a.jwt"},
            timeout=30,
        )
        assert r.status_code == 401

    def test_admin_verify_wrong_password(self):
        r = requests.post(f"{API}/admin/verify", json={"password": "wrongpass"}, timeout=30)
        assert r.status_code == 200
        assert r.json().get("ok") is False

    def test_put_tags_with_valid_token(self, admin_token, sample_object_name):
        headers = {"Authorization": f"Bearer {admin_token}"}
        # write a status
        r = requests.put(
            f"{API}/tags",
            json={"object_name": sample_object_name, "status": "fabricado", "observation": "TEST_p0"},
            headers=headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["object_name"] == sample_object_name
        assert data["status"] == "fabricado"
        # verify persistence
        g = requests.get(f"{API}/object", params={"name": sample_object_name}, timeout=30)
        assert g.status_code == 200
        assert g.json()["status"] == "fabricado"


# ---------- P1: PDF and XLSX export ----------

class TestReportExport:
    def test_pdf_export(self):
        r = requests.get(
            f"{API}/report/export",
            params={"format": "pdf", "from": "2020-01-01", "to": "2030-01-01", "status": "all", "facade": "all"},
            timeout=120,
        )
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"
        assert len(r.content) > 2000  # non-trivial

    def test_xlsx_export(self):
        r = requests.get(
            f"{API}/report/export",
            params={"format": "xlsx", "from": "2020-01-01", "to": "2030-01-01", "status": "all", "facade": "all"},
            timeout=60,
        )
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "spreadsheetml" in ct or "openxml" in ct
        assert r.content[:2] == b"PK"  # xlsx = zip


# ---------- P2 backend enabling: /api/photos returns gallery items ----------

class TestPhotosGallery:
    def test_photos_endpoint(self):
        r = requests.get(f"{API}/photos", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "total" in data
        # if any items, verify item schema (name field is needed for jump-to-piece)
        for it in data["items"][:3]:
            assert "name" in it
            assert "photo" in it

"""Backend tests for iter11: auto-create tipo from mold form and molde/tipo filters on report + export."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bim-progress-hub.preview.emergentagent.com").rstrip("/")
ADMIN_PW = "admin2026"

QA_MOLD = "QA_ITER11_M01"
QA_TIPO = "QA_ITER11_TIPO"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/verify", json={"password": ADMIN_PW}, timeout=15)
    assert r.status_code == 200, r.text
    tok = r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module", autouse=True)
def cleanup(auth_headers):
    yield
    # best-effort cleanup
    requests.delete(f"{BASE_URL}/api/molds/{QA_MOLD}", headers=auth_headers, timeout=15)
    requests.delete(f"{BASE_URL}/api/tipos/{QA_TIPO}", headers=auth_headers, timeout=15)


def test_admin_verify(admin_token):
    assert isinstance(admin_token, str) and len(admin_token) > 10


def test_auto_create_tipo_from_mold(auth_headers):
    # Ensure tipo is not present first (delete if present, ignore result)
    requests.delete(f"{BASE_URL}/api/tipos/{QA_TIPO}", headers=auth_headers, timeout=10)
    requests.delete(f"{BASE_URL}/api/molds/{QA_MOLD}", headers=auth_headers, timeout=10)

    payload = {"name": QA_MOLD, "tipo": QA_TIPO, "color": "#FF00AA", "ancho": 1.5, "alto": 2.0}
    r = requests.post(f"{BASE_URL}/api/molds", json=payload, headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == QA_MOLD
    assert body["tipo"] == QA_TIPO
    assert body["color"].upper() == "#FF00AA"

    # Verify tipo auto-registered in tipos catalog
    r2 = requests.get(f"{BASE_URL}/api/tipos", timeout=10)
    assert r2.status_code == 200
    assert QA_TIPO in (r2.json().get("items") or [])

    # Verify mold in molds list
    r3 = requests.get(f"{BASE_URL}/api/molds", timeout=10)
    assert r3.status_code == 200
    names = [m["name"] for m in r3.json().get("items", [])]
    assert QA_MOLD in names


def test_report_filters_by_molde_and_tipo(auth_headers):
    # Filter by our QA mold (no panel is tagged with it) -> con_molde must be 0
    r = requests.get(f"{BASE_URL}/api/report/molds", params={"facade": "all", "molde": QA_MOLD, "tipo": "all"}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["con_molde"] == 0
    # every item's molde must be QA_MOLD or absent (should be empty since __none__ excluded)
    for it in d["items"]:
        assert it["molde"] == QA_MOLD

    # Filter by tipo QA_ITER11_TIPO -> 0 items also
    r2 = requests.get(f"{BASE_URL}/api/report/molds", params={"tipo": QA_TIPO}, timeout=15)
    assert r2.status_code == 200
    for it in r2.json()["items"]:
        assert it["tipo"] == QA_TIPO

    # Filter __none__ molde returns only untagged panels (all with molde None)
    r3 = requests.get(f"{BASE_URL}/api/report/molds", params={"molde": "__none__"}, timeout=15)
    assert r3.status_code == 200
    for it in r3.json()["items"]:
        assert it["molde"] is None


def test_export_endpoints_accept_filters():
    for fmt in ("pdf", "xlsx"):
        r = requests.get(
            f"{BASE_URL}/api/report/molds/export",
            params={"format": fmt, "facade": "all", "molde": QA_MOLD, "tipo": QA_TIPO},
            timeout=30,
        )
        assert r.status_code == 200, f"{fmt}: {r.status_code} {r.text[:200]}"
        assert len(r.content) > 100
        ct = r.headers.get("content-type", "").lower()
        if fmt == "pdf":
            assert "pdf" in ct or r.content[:4] == b"%PDF"
        else:
            assert "sheet" in ct or "excel" in ct or "octet" in ct

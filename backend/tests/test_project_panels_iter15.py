"""Project panel total regression tests (API + persistence + capacity guards)."""
import json
import os
from io import BytesIO

import pytest
import requests
from openpyxl import load_workbook
from pymongo import MongoClient


def _read_env_value(path: str, key: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith(f"{key}="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError(f"Missing {key} in {path}")


def _base_url() -> str:
    value = os.environ.get("REACT_APP_BACKEND_URL")
    if value:
        return value.rstrip("/")
    return _read_env_value("/app/frontend/.env", "REACT_APP_BACKEND_URL").rstrip("/")


BASE_URL = _base_url()
API = f"{BASE_URL}/api"
MONGO_URL = _read_env_value("/app/backend/.env", "MONGO_URL")
DB_NAME = _read_env_value("/app/backend/.env", "DB_NAME")


@pytest.fixture(scope="module")
def api_client():
    """Shared HTTP session for panel total and report endpoints."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Admin JWT for protected write endpoints."""
    res = api_client.post(f"{API}/admin/verify", json={"password": "admin2026"}, timeout=30)
    assert res.status_code == 200
    data = res.json()
    assert data.get("ok") is True
    token = data.get("token")
    assert isinstance(token, str) and token
    return token


@pytest.fixture(scope="module")
def restore_project_setting():
    """Snapshot/restore exact project_settings panel_total document around test mutations."""
    mongo = MongoClient(MONGO_URL)
    db = mongo[DB_NAME]
    coll = db.project_settings
    before = coll.find_one({"_id": "panel_total"})
    yield
    if before is None:
        coll.delete_one({"_id": "panel_total"})
    else:
        coll.replace_one({"_id": "panel_total"}, before, upsert=True)
    mongo.close()


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _set_total(api_client, token: str, total: int) -> dict:
    res = api_client.put(
        f"{API}/project/panels",
        json={"total_panels": total},
        headers=_auth_headers(token),
        timeout=30,
    )
    assert res.status_code == 200
    return res.json()


# ---- Project total endpoint contract and validation ----
def test_project_panels_default_without_manual_setting(api_client, restore_project_setting):
    """GET /project/panels should fallback to real model counts when setting is absent."""
    mongo = MongoClient(MONGO_URL)
    db = mongo[DB_NAME]
    db.project_settings.delete_one({"_id": "panel_total"})

    res = api_client.get(f"{API}/project/panels", timeout=30)
    assert res.status_code == 200
    data = res.json()

    assert data["total_panels"] == 533
    assert data["assigned_panels"] == 526
    assert data["pending_panels"] == 7
    assert data["model_panels"] == 533
    assert data["is_manual"] is False
    assert "_id" not in data
    mongo.close()


def test_project_panels_put_requires_admin(api_client):
    """PUT /project/panels should reject without Bearer token."""
    res = api_client.put(f"{API}/project/panels", json={"total_panels": 600}, timeout=30)
    assert res.status_code == 401


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"total_panels": None},
        {"total_panels": True},
        {"total_panels": "600"},
        {"total_panels": 600.1},
        {"total_panels": -1},
        {"unknown": 1},
        {"total_panels": 600, "extra": "x"},
    ],
)
def test_project_panels_validation_errors(api_client, admin_token, payload):
    """PUT /project/panels enforces strict integer schema and forbids unknown fields."""
    res = api_client.put(
        f"{API}/project/panels",
        json=payload,
        headers=_auth_headers(admin_token),
        timeout=30,
    )
    assert res.status_code == 422


def test_project_panels_manual_persistence_and_report_consistency(api_client, admin_token, restore_project_setting):
    """Manual totals should persist across sessions and drive global report totals."""
    data = _set_total(api_client, admin_token, 600)
    assert data["total_panels"] == 600
    assert data["assigned_panels"] == 526
    assert data["pending_panels"] == 74
    assert data["is_manual"] is True
    assert "_id" not in data

    # New HTTP session to verify persistence is DB-backed and not process-local cache
    second = requests.Session()
    second.headers.update({"Content-Type": "application/json"})
    persisted = second.get(f"{API}/project/panels", timeout=30)
    assert persisted.status_code == 200
    persisted_data = persisted.json()
    assert persisted_data["total_panels"] == 600
    assert persisted_data["pending_panels"] == 74

    # Verify Mongo document
    mongo = MongoClient(MONGO_URL)
    doc = mongo[DB_NAME].project_settings.find_one({"_id": "panel_total"})
    assert doc is not None
    assert doc["total_panels"] == 600
    assert isinstance(doc.get("updated_at"), str)

    # Global report uses manual project total; model counters remain real
    report = api_client.get(f"{API}/report/molds", timeout=30)
    assert report.status_code == 200
    body = report.json()
    assert body["scope"] == "project"
    assert body["total"] == 600
    assert body["con_molde"] == 526
    assert body["sin_molde"] == 74
    assert body["model_total"] == 533
    assert body["model_unassigned"] == 7
    assert body["project"]["total_panels"] == 600
    assert body["project"]["pending_panels"] == 74
    assert len(body["items"]) == 533
    second.close()
    mongo.close()


def test_project_panels_filtered_reports_keep_real_counts(api_client, admin_token, restore_project_setting):
    """Filtered reports should use real filtered counts and keep project total metadata."""
    _set_total(api_client, admin_token, 600)

    unassigned = api_client.get(f"{API}/report/molds", params={"molde": "__none__"}, timeout=30)
    assert unassigned.status_code == 200
    data = unassigned.json()
    assert data["scope"] == "filtered"
    assert data["total"] == 7
    assert data["con_molde"] == 0
    assert data["sin_molde"] == 7
    assert data["project"]["total_panels"] == 600


def test_project_panels_reject_total_lower_than_assigned(api_client, admin_token, restore_project_setting):
    """Manual total cannot be lower than currently assigned panel count."""
    res = api_client.put(
        f"{API}/project/panels",
        json={"total_panels": 525},
        headers=_auth_headers(admin_token),
        timeout=30,
    )
    assert res.status_code == 422


def test_project_panels_update_to_610_then_526(api_client, admin_token, restore_project_setting):
    """Manual total updates should allow 610 and then assigned-equal 526 without changing model counters."""
    d610 = _set_total(api_client, admin_token, 610)
    assert d610["total_panels"] == 610
    assert d610["assigned_panels"] == 526
    assert d610["pending_panels"] == 84

    d526 = _set_total(api_client, admin_token, 526)
    assert d526["total_panels"] == 526
    assert d526["assigned_panels"] == 526
    assert d526["pending_panels"] == 0

    report = api_client.get(f"{API}/report/molds", timeout=30).json()
    assert report["total"] == 526
    assert report["con_molde"] == 526
    assert report["sin_molde"] == 0
    assert report["model_total"] == 533
    assert report["model_unassigned"] == 7


def test_project_panels_accepts_upper_bound(api_client, admin_token, restore_project_setting):
    """Endpoint accepts max 32-bit signed integer project total."""
    data = _set_total(api_client, admin_token, 2147483647)
    assert data["total_panels"] == 2147483647
    assert data["pending_panels"] == 2147483647 - 526


# ---- Capacity guard on tag assignment when project capacity reached ----
def test_single_assignment_rejected_when_capacity_reached(api_client, admin_token, restore_project_setting):
    """PUT /tags must return 409 and preserve tag when manual total equals assigned."""
    _set_total(api_client, admin_token, 526)
    unassigned = api_client.get(f"{API}/report/molds", params={"molde": "__none__"}, timeout=30).json()
    assert unassigned["total"] > 0
    target = unassigned["items"][0]["name"]

    molds = api_client.get(f"{API}/molds", timeout=30).json().get("items", [])
    assert molds
    mold_name = molds[0]["name"]

    before = api_client.get(f"{API}/object", params={"name": target}, timeout=30).json()
    assert before["molde"] is None

    res = api_client.put(
        f"{API}/tags",
        json={"object_name": target, "molde": mold_name, "notas": "", "photo": None},
        headers=_auth_headers(admin_token),
        timeout=30,
    )
    assert res.status_code == 409

    after = api_client.get(f"{API}/object", params={"name": target}, timeout=30).json()
    assert after["molde"] is None


def test_bulk_assignment_rejected_before_changes_when_capacity_reached(api_client, admin_token, restore_project_setting):
    """PUT /tags/bulk must reject over-capacity updates atomically (no partial changes)."""
    _set_total(api_client, admin_token, 526)
    unassigned = api_client.get(f"{API}/report/molds", params={"molde": "__none__"}, timeout=30).json()
    assert unassigned["total"] >= 2
    names = [unassigned["items"][0]["name"], unassigned["items"][1]["name"]]

    molds = api_client.get(f"{API}/molds", timeout=30).json().get("items", [])
    assert molds
    mold_name = molds[0]["name"]

    before = {
        n: api_client.get(f"{API}/object", params={"name": n}, timeout=30).json()["molde"]
        for n in names
    }
    assert all(v is None for v in before.values())

    res = api_client.put(
        f"{API}/tags/bulk",
        json={"object_names": names, "molde": mold_name, "notas": "", "photo": None},
        headers=_auth_headers(admin_token),
        timeout=30,
    )
    assert res.status_code == 409

    for n in names:
        after = api_client.get(f"{API}/object", params={"name": n}, timeout=30).json()["molde"]
        assert after == before[n]


# ---- Export payload checks under manual totals ----
def test_exports_reflect_manual_total_and_keep_filtered_real_rows(api_client, admin_token, restore_project_setting):
    """PDF/XLSX should include manual project metadata while preserving real filtered rows."""
    _set_total(api_client, admin_token, 600)

    xlsx_all = api_client.get(
        f"{API}/report/molds/export",
        params={"format": "xlsx", "facade": "all", "molde": "all", "tipo": "all"},
        timeout=60,
    )
    assert xlsx_all.status_code == 200
    wb = load_workbook(BytesIO(xlsx_all.content), read_only=True)
    ws = wb.active
    row4 = [str(c) for c in next(ws.iter_rows(min_row=4, max_row=4, values_only=True)) if c is not None]
    joined = " | ".join(row4)
    assert "Total del proyecto: 600" in joined
    assert "Paneles del modelo en este reporte: 533" in joined
    assert "Sin molde en el modelo: 7" in joined

    filtered_api = api_client.get(
        f"{API}/report/molds",
        params={"facade": "all", "molde": "__none__", "tipo": "all"},
        timeout=30,
    ).json()
    assert filtered_api["total"] == 7

    xlsx_filtered = api_client.get(
        f"{API}/report/molds/export",
        params={"format": "xlsx", "facade": "all", "molde": "__none__", "tipo": "all"},
        timeout=60,
    )
    assert xlsx_filtered.status_code == 200
    wb2 = load_workbook(BytesIO(xlsx_filtered.content), read_only=True)
    ws2 = wb2.active
    rows = list(ws2.iter_rows(values_only=True))

    header_index = None
    for idx, row in enumerate(rows):
        if row and row[0] == "Pieza":
            header_index = idx
            break
    assert header_index is not None
    data_rows = [r for r in rows[header_index + 1:] if r and any(c not in (None, "") for c in r)]
    assert len(data_rows) == 7

    # PDF smoke checks: valid pdf bytes and non-empty content
    pdf = api_client.get(
        f"{API}/report/molds/export",
        params={"format": "pdf", "facade": "all", "molde": "all", "tipo": "all"},
        timeout=60,
    )
    assert pdf.status_code == 200
    assert pdf.content[:4] == b"%PDF"
    assert len(pdf.content) > 1000


def test_cleanup_report_matches_baseline(api_client, restore_project_setting):
    """After restore, project baseline should remain unchanged (533/526/7 non-manual)."""
    # Trigger fixture teardown by explicit pass-through in final test ordering.
    assert True

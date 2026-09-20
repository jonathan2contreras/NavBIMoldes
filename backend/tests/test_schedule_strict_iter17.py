"""Strict schedule API invariants/regression tests for floor-clockwise planning and guarded edits."""

from __future__ import annotations

from datetime import date, timedelta
import os

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient


def _env(name: str) -> str:
    value = os.environ.get(name)
    if value:
        return value.strip().strip('"')
    return ""


def _base_url() -> str:
    base = _env("REACT_APP_BACKEND_URL")
    if not base:
        base = str((dotenv_values("/app/frontend/.env").get("REACT_APP_BACKEND_URL") or "")).strip()
    if not base:
        pytest.skip("Missing REACT_APP_BACKEND_URL")
    return base.rstrip("/")


BASE_URL = _base_url()
API = f"{BASE_URL}/api"
FACADE_ORDER = {"oeste": 0, "norte": 1, "este": 2, "sur": 3}


@pytest.fixture(scope="module")
def http():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def mongo_state():
    mongo_url = _env("MONGO_URL")
    db_name = _env("DB_NAME")
    if not mongo_url or not db_name:
        vals = dotenv_values("/app/backend/.env")
        mongo_url = mongo_url or str(vals.get("MONGO_URL", "")).strip().strip('"')
        db_name = db_name or str(vals.get("DB_NAME", "")).strip().strip('"')
    if not mongo_url or not db_name:
        pytest.skip("Missing MONGO_URL/DB_NAME")

    client = MongoClient(mongo_url)
    collection = client[db_name].production_schedules
    original = collection.find_one({"_id": "production"})
    yield {"collection": collection, "original": original, "client": client}

    if original is None:
        collection.delete_one({"_id": "production"})
    else:
        collection.replace_one({"_id": "production"}, original, upsert=True)
    client.close()


@pytest.fixture(scope="module")
def admin_token(http):
    response = http.post(f"{API}/admin/verify", json={"password": "admin2026"}, timeout=30)
    assert response.status_code == 200
    payload = response.json()
    assert payload.get("ok") is True
    token = payload.get("token")
    assert isinstance(token, str) and token
    return token


def _admin_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _get_schedule(http) -> dict:
    response = http.get(f"{API}/schedule", timeout=60)
    assert response.status_code == 200
    return response.json()


def _working_next(day_iso: str) -> str:
    day = date.fromisoformat(day_iso) + timedelta(days=1)
    while day.weekday() == 6:
        day += timedelta(days=1)
    return day.isoformat()


# Module: strict preview metadata, inferred floors/stages, and fixed expected planning window
def test_preview_strict_counts_and_metadata(http, mongo_state):
    mongo_state["collection"].delete_one({"_id": "production"})
    data = _get_schedule(http)

    assert data["strategy"] == "strict_floor_clockwise_v1"
    assert data["saved"] is False
    assert data["revision"] == 0
    assert data["start_date"] == "2026-11-01"
    assert data["daily_capacity"] == 5
    assert data["schedulable"] == 526
    assert data["scheduled"] == 526
    assert data["unscheduled"] == 0
    assert data["total_project"] == 526
    assert data["first_date"] == "2026-11-02"
    assert data["finish_date"] == "2027-10-29"
    assert data["working_day_span"] == 311

    assert len(data["floors"]) == 7
    labels = [f["label"] for f in data["floors"]]
    assert labels == ["Planta baja", "Planta 1", "Planta 2", "Planta 3", "Planta 4", "Planta 5", "Planta 6"]
    elevations = [round(f["elevation"], 3) for f in data["floors"]]
    assert elevations == [0.28, 4.724, 10.444, 15.13, 19.444, 24.13, 28.444]

    assert len(data["stages"]) == 24


# Module: production order invariants day/mold limits + stage transitions + sequence monotonicity
def test_order_and_capacity_invariants(http):
    data = _get_schedule(http)
    panels = data["panels"]
    start = data["start_date"]

    assert len(panels) == 526
    assert len({p["object_name"] for p in panels}) == 526

    by_day_stage = {}
    by_day_count = {}
    by_day_mold = set()
    previous_date = None
    previous_stage = None

    for p in sorted(panels, key=lambda item: item["sequence_index"]):
        assert p["stage_index"] == p["floor_index"] * 4 + FACADE_ORDER[p["facade"]]
        assert p["date"] is not None
        current = p["date"]
        d = date.fromisoformat(current)
        assert current >= start
        assert d.weekday() != 6

        if previous_date is not None:
            assert current >= previous_date
            if current == previous_date:
                assert p["stage_index"] == previous_stage
        previous_date = current
        previous_stage = p["stage_index"]

        by_day_count[current] = by_day_count.get(current, 0) + 1
        key = (current, p["molde"])
        assert key not in by_day_mold
        by_day_mold.add(key)

        if current in by_day_stage:
            assert by_day_stage[current] == p["stage_index"]
        else:
            by_day_stage[current] = p["stage_index"]

    assert all(c <= data["daily_capacity"] for c in by_day_count.values())

    stage_dates = {}
    for p in panels:
        stage_dates.setdefault(p["stage_index"], []).append(p["date"])
    for stage in sorted(stage_dates):
        finish = max(stage_dates[stage])
        if stage + 1 in stage_dates:
            start_next = min(stage_dates[stage + 1])
            assert start_next == _working_next(finish)


# Module: explicit floor/facade route checks for PB West then PB North then P1 West
def test_pb_windows_and_empty_facade_skips(http):
    data = _get_schedule(http)
    panels = data["panels"]

    pb_west = [p for p in panels if p["floor_index"] == 0 and p["facade"] == "oeste"]
    pb_north = [p for p in panels if p["floor_index"] == 0 and p["facade"] == "norte"]
    pb_east = [p for p in panels if p["floor_index"] == 0 and p["facade"] == "este"]
    pb_south = [p for p in panels if p["floor_index"] == 0 and p["facade"] == "sur"]
    p1_west = [p for p in panels if p["floor_index"] == 1 and p["facade"] == "oeste"]

    assert len(pb_west) == 13
    assert min(p["date"] for p in pb_west) == "2026-11-02"
    assert max(p["date"] for p in pb_west) == "2026-11-14"

    assert len(pb_north) == 29
    assert min(p["date"] for p in pb_north) == "2026-11-16"
    assert max(p["date"] for p in pb_north) == "2026-12-16"

    assert len(pb_east) == 0
    assert len(pb_south) == 0

    assert p1_west
    assert min(p["date"] for p in p1_west) == "2026-12-17"


# Module: auth guards and strict move precedence behavior
def test_public_read_and_guarded_write(http):
    public = http.get(f"{API}/schedule", timeout=30)
    assert public.status_code == 200

    denied = http.post(f"{API}/schedule/save", json={"revision": 0}, timeout=30)
    assert denied.status_code == 401


def test_remove_first_then_block_later_then_restore_slot(http, admin_token):
    current = _get_schedule(http)
    first_panel = sorted(current["panels"], key=lambda p: p["sequence_index"])[0]
    later_panel = sorted(current["panels"], key=lambda p: p["sequence_index"])[20]

    remove = http.patch(
        f"{API}/schedule/panel",
        json={"object_name": first_panel["object_name"], "date": None, "revision": current["revision"]},
        headers=_admin_headers(admin_token),
        timeout=60,
    )
    assert remove.status_code == 200
    removed = remove.json()
    assert next(p for p in removed["panels"] if p["object_name"] == first_panel["object_name"])["date"] is None

    blocked = http.patch(
        f"{API}/schedule/panel",
        json={"object_name": later_panel["object_name"], "date": later_panel["date"], "revision": removed["revision"]},
        headers=_admin_headers(admin_token),
        timeout=60,
    )
    assert blocked.status_code == 409

    restore = http.patch(
        f"{API}/schedule/panel",
        json={"object_name": first_panel["object_name"], "date": first_panel["date"], "revision": removed["revision"]},
        headers=_admin_headers(admin_token),
        timeout=60,
    )
    assert restore.status_code == 200
    restored = restore.json()
    assert next(p for p in restored["panels"] if p["object_name"] == first_panel["object_name"])["date"] == first_panel["date"]


# Module: fill must preserve all fixed dates and only recover pending slot
def test_fill_recovers_removed_panel_without_shifting_others(http, admin_token):
    before = _get_schedule(http)
    dated = [p for p in before["panels"] if p["date"]]
    target = dated[40]
    original_dates = {p["object_name"]: p["date"] for p in before["panels"]}

    remove = http.patch(
        f"{API}/schedule/panel",
        json={"object_name": target["object_name"], "date": None, "revision": before["revision"]},
        headers=_admin_headers(admin_token),
        timeout=60,
    )
    assert remove.status_code == 200
    removed = remove.json()

    fill = http.post(
        f"{API}/schedule/fill",
        json={"revision": removed["revision"]},
        headers=_admin_headers(admin_token),
        timeout=60,
    )
    assert fill.status_code == 200
    after = fill.json()
    after_dates = {p["object_name"]: p["date"] for p in after["panels"]}

    for name, old_date in original_dates.items():
        assert after_dates[name] == old_date


# Module: baseline integrity check for molds/project counters after schedule tests
def test_report_molds_summary_stable(http):
    response = http.get(f"{API}/report/molds", timeout=60)
    assert response.status_code == 200
    payload = response.json()

    assert payload["total"] == 526
    assert payload["con_molde"] == 526
    assert payload["sin_molde"] == 0
    assert payload["model_total"] == 533
    assert payload["model_unassigned"] == 7
    assert payload["project"]["total_panels"] == 526
    assert payload["project"]["assigned_panels"] == 526

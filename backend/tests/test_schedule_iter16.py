"""Schedule API regression tests for deterministic planning, CAS writes, and move/fill constraints."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
import json
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
        base = (dotenv_values("/app/frontend/.env").get("REACT_APP_BACKEND_URL") or "").strip()
    if not base:
        pytest.skip("Missing REACT_APP_BACKEND_URL")
    return base.rstrip("/")


BASE_URL = _base_url()
API = f"{BASE_URL}/api"


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
    state = {"client": client, "collection": collection, "original": original}
    yield state

    if state["original"] is None:
        state["collection"].delete_one({"_id": "production"})
    else:
        state["collection"].replace_one({"_id": "production"}, state["original"], upsert=True)
    state["client"].close()


@pytest.fixture(scope="module")
def http():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


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
    r = http.get(f"{API}/schedule", timeout=60)
    assert r.status_code == 200
    return r.json()


def _day_counts(panels: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for p in panels:
        if p.get("date"):
            counts[p["date"]] = counts.get(p["date"], 0) + 1
    return counts


def _find_movable_panel(schedule: dict) -> tuple[dict, str]:
    dated = [p for p in schedule["panels"] if p.get("date")]
    assert dated, "No scheduled panels found"
    by_day = _day_counts(schedule["panels"])
    start = date.fromisoformat(schedule["start_date"])
    horizon = start + timedelta(days=120)
    for panel in dated:
        current_day = panel["date"]
        occupied_same_mold = {
            p["date"]
            for p in schedule["panels"]
            if p.get("date") and p["molde"] == panel["molde"] and p["object_name"] != panel["object_name"]
        }
        day = start
        while day <= horizon:
            target = day.isoformat()
            if day.weekday() != 6 and target >= schedule["start_date"] and target != current_day:
                if target not in occupied_same_mold and by_day.get(target, 0) < schedule["daily_capacity"]:
                    return panel, target
            day += timedelta(days=1)
    pytest.skip("Could not find a legal move slot for any panel")


# Module: GET /api/schedule deterministic preview, invariants, and no ObjectId leaks
def test_schedule_preview_deterministic_and_constraints(http, mongo_state):
    mongo_state["collection"].delete_one({"_id": "production"})
    data = _get_schedule(http)

    assert data["saved"] is False
    assert data["revision"] == 0
    assert data["start_date"] == "2026-11-01"
    assert data["daily_capacity"] == 5
    assert data["working_days"] == [0, 1, 2, 3, 4, 5]
    assert data["first_date"] == "2026-11-02"
    assert data["finish_date"] == "2027-05-20"
    assert data["working_day_span"] == 172
    assert data["schedulable"] == 526
    assert data["scheduled"] == 526
    assert data["unscheduled"] == 0
    assert data["total_project"] == 526
    assert len(data["molds"]) == 11
    assert "_id" not in data

    names = [p["object_name"] for p in data["panels"]]
    assert len(names) == len(set(names)) == 526
    assert all(p.get("date") for p in data["panels"])

    by_day = {}
    by_day_mold = set()
    for panel in data["panels"]:
        key = (panel["date"], panel["molde"])
        assert key not in by_day_mold
        by_day_mold.add(key)
        by_day[panel["date"]] = by_day.get(panel["date"], 0) + 1
    assert all(total <= data["daily_capacity"] for total in by_day.values())


# Module: save/generate/fill endpoints with optimistic revision semantics
def test_save_persists_preview_and_reloads(http, admin_token):
    response = http.post(f"{API}/schedule/save", json={"revision": 0}, headers=_admin_headers(admin_token), timeout=60)
    assert response.status_code == 200
    saved = response.json()
    assert saved["saved"] is True
    assert saved["revision"] == 1
    assert isinstance(saved.get("updated_at"), str) and saved["updated_at"]

    again = _get_schedule(http)
    assert again["saved"] is True
    assert again["revision"] == 1
    assert again["start_date"] == saved["start_date"]
    assert again["daily_capacity"] == saved["daily_capacity"]


def test_generate_validates_start_date_and_capacity(http, admin_token):
    current = _get_schedule(http)
    body = {"start_date": "2026-11-01", "daily_capacity": 5, "revision": current["revision"]}
    ok = http.post(f"{API}/schedule/generate", json=body, headers=_admin_headers(admin_token), timeout=60)
    assert ok.status_code == 200
    generated = ok.json()
    assert generated["first_date"] == "2026-11-02"
    assert generated["daily_capacity"] == 5
    assert generated["start_date"] == "2026-11-01"

    stale = http.post(f"{API}/schedule/generate", json=body, headers=_admin_headers(admin_token), timeout=30)
    assert stale.status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        {"start_date": "2026-11-01", "daily_capacity": 0, "revision": 0},
        {"start_date": "2026-11-01", "daily_capacity": -2, "revision": 0},
        {"start_date": "2026-11-01", "daily_capacity": 1001, "revision": 0},
        {"start_date": "2026-11-01", "daily_capacity": 3.5, "revision": 0},
        {"start_date": "2026-11-01", "daily_capacity": True, "revision": 0},
        {"start_date": "1999-01-01", "daily_capacity": 5, "revision": 0},
        {"start_date": "2091-01-01", "daily_capacity": 5, "revision": 0},
        {"start_date": "2026-11-01", "daily_capacity": "5", "revision": 0},
        {"start_date": "2026-11-01", "daily_capacity": 5, "revision": 0, "extra": "x"},
    ],
)
def test_generate_rejects_invalid_schema_and_ranges(http, admin_token, payload):
    response = http.post(f"{API}/schedule/generate", json=payload, headers=_admin_headers(admin_token), timeout=30)
    assert response.status_code == 422


def test_fill_only_schedules_pending_without_moving_fixed(http, admin_token):
    snapshot = _get_schedule(http)
    fixed = next((p for p in snapshot["panels"] if p.get("date")), None)
    assert fixed is not None
    to_unschedule = next((p for p in snapshot["panels"] if p.get("date") and p["object_name"] != fixed["object_name"]), None)
    assert to_unschedule is not None

    drop = http.patch(
        f"{API}/schedule/panel",
        json={"object_name": to_unschedule["object_name"], "date": None, "revision": snapshot["revision"]},
        headers=_admin_headers(admin_token),
        timeout=60,
    )
    assert drop.status_code == 200
    dropped = drop.json()
    assert any(p["object_name"] == to_unschedule["object_name"] and p["date"] is None for p in dropped["panels"])

    fill = http.post(
        f"{API}/schedule/fill",
        json={"revision": dropped["revision"]},
        headers=_admin_headers(admin_token),
        timeout=60,
    )
    assert fill.status_code == 200
    filled = fill.json()
    fixed_after = next(p for p in filled["panels"] if p["object_name"] == fixed["object_name"])
    assert fixed_after["date"] == fixed["date"]
    restored = next(p for p in filled["panels"] if p["object_name"] == to_unschedule["object_name"])
    assert restored["date"] is not None


# Module: PATCH /api/schedule/panel move validation and conflict checks
def test_patch_panel_valid_date_not_422_and_revision_increments(http, admin_token):
    current = _get_schedule(http)
    panel, target = _find_movable_panel(current)
    moved = http.patch(
        f"{API}/schedule/panel",
        json={"object_name": panel["object_name"], "date": target, "revision": current["revision"]},
        headers=_admin_headers(admin_token),
        timeout=60,
    )
    assert moved.status_code == 200
    payload = moved.json()
    found = next(p for p in payload["panels"] if p["object_name"] == panel["object_name"])
    assert found["date"] == target
    assert payload["revision"] == current["revision"] + 1


def test_patch_rejects_sunday_before_start_and_far_future(http, admin_token):
    current = _get_schedule(http)
    panel = next(p for p in current["panels"] if p.get("date"))
    bad_dates = [
        "2026-11-01",  # Sunday
        "2026-10-31",  # Before start
        "2036-11-02",  # > 10-year horizon from start
    ]
    for bad in bad_dates:
        r = http.patch(
            f"{API}/schedule/panel",
            json={"object_name": panel["object_name"], "date": bad, "revision": current["revision"]},
            headers=_admin_headers(admin_token),
            timeout=30,
        )
        assert r.status_code == 422


def test_patch_rejects_invalid_panel_name(http, admin_token):
    current = _get_schedule(http)
    r = http.patch(
        f"{API}/schedule/panel",
        json={"object_name": "NOT_A_REAL_PANEL", "date": "2026-11-03", "revision": current["revision"]},
        headers=_admin_headers(admin_token),
        timeout=30,
    )
    assert r.status_code == 422


def test_patch_same_panel_same_day_valid(http, admin_token):
    current = _get_schedule(http)
    panel = next(p for p in current["panels"] if p.get("date"))
    r = http.patch(
        f"{API}/schedule/panel",
        json={"object_name": panel["object_name"], "date": panel["date"], "revision": current["revision"]},
        headers=_admin_headers(admin_token),
        timeout=60,
    )
    assert r.status_code == 200
    payload = r.json()
    same = next(p for p in payload["panels"] if p["object_name"] == panel["object_name"])
    assert same["date"] == panel["date"]


def test_patch_rejects_duplicate_same_mold_same_day(http, admin_token):
    current = _get_schedule(http)
    by_mold = {}
    for p in current["panels"]:
        if p.get("date"):
            by_mold.setdefault(p["molde"], []).append(p)
    mold_group = next(v for v in by_mold.values() if len(v) >= 2)
    source = mold_group[0]
    occupied_day = mold_group[1]["date"]
    r = http.patch(
        f"{API}/schedule/panel",
        json={"object_name": source["object_name"], "date": occupied_day, "revision": current["revision"]},
        headers=_admin_headers(admin_token),
        timeout=30,
    )
    assert r.status_code == 409


def test_patch_rejects_global_full_capacity_day(http, admin_token):
    current = _get_schedule(http)
    counts = _day_counts(current["panels"])
    full_day = next(day for day, count in counts.items() if count >= current["daily_capacity"])
    panel = next(p for p in current["panels"] if p.get("date") and p["date"] != full_day)
    mold_occupied = {p["molde"] for p in current["panels"] if p.get("date") == full_day}
    if panel["molde"] in mold_occupied:
        panel = next(
            p for p in current["panels"] if p.get("date") and p["date"] != full_day and p["molde"] not in mold_occupied
        )
    r = http.patch(
        f"{API}/schedule/panel",
        json={"object_name": panel["object_name"], "date": full_day, "revision": current["revision"]},
        headers=_admin_headers(admin_token),
        timeout=30,
    )
    assert r.status_code == 409


# Module: auth guards + stale revision CAS behavior
def test_public_get_and_unauthenticated_write_rejected(http):
    read = http.get(f"{API}/schedule", timeout=30)
    assert read.status_code == 200
    write = http.post(f"{API}/schedule/save", json={"revision": 0}, timeout=30)
    assert write.status_code == 401


def test_stale_revision_conflict_no_write(http, admin_token):
    current = _get_schedule(http)
    first = http.post(
        f"{API}/schedule/save",
        json={"revision": current["revision"]},
        headers=_admin_headers(admin_token),
        timeout=60,
    )
    assert first.status_code == 200
    stale = http.post(
        f"{API}/schedule/save",
        json={"revision": current["revision"]},
        headers=_admin_headers(admin_token),
        timeout=30,
    )
    assert stale.status_code == 409


def test_same_revision_concurrent_updates_only_one_wins(http, admin_token):
    current = _get_schedule(http)
    panel = next(p for p in current["panels"] if p.get("date"))
    payload = {"object_name": panel["object_name"], "date": None, "revision": current["revision"]}

    def _call_once():
        return http.patch(f"{API}/schedule/panel", json=payload, headers=_admin_headers(admin_token), timeout=60)

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = [f.result() for f in [pool.submit(_call_once), pool.submit(_call_once)]]

    codes = sorted(r.status_code for r in responses)
    assert codes == [200, 409]


# Module: source consistency and baseline safeguards
def test_report_molds_baseline_summary_unchanged_after_restore(http, mongo_state):
    original = mongo_state["original"]
    if original is None:
        mongo_state["collection"].delete_one({"_id": "production"})
    else:
        mongo_state["collection"].replace_one({"_id": "production"}, original, upsert=True)

    baseline = json.load(open("/tmp/schedule-source-before.json", "r", encoding="utf-8"))
    current = http.get(f"{API}/report/molds", timeout=60)
    assert current.status_code == 200
    payload = current.json()

    assert payload["total"] == baseline["total"] == 526
    assert payload["con_molde"] == baseline["con_molde"] == 526
    assert payload["sin_molde"] == baseline["sin_molde"] == 0
    assert payload["model_total"] == baseline["model_total"] == 533
    assert payload["model_unassigned"] == baseline["model_unassigned"] == 7
    assert payload["project"]["total_panels"] == baseline["project"]["total_panels"] == 526
    assert payload["project"]["assigned_panels"] == baseline["project"]["assigned_panels"] == 526

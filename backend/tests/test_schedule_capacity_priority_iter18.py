"""Capacity-priority schedule regression tests for quantity-first planning and safe restoration."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import date
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
        base = str((dotenv_values("/app/frontend/.env").get("REACT_APP_BACKEND_URL") or "")).strip()
    if not base:
        pytest.skip("Missing REACT_APP_BACKEND_URL")
    return base.rstrip("/")


BASE_URL = _base_url()
API = f"{BASE_URL}/api"


def _admin_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _get_schedule(session: requests.Session) -> dict:
    response = session.get(f"{API}/schedule", timeout=60)
    assert response.status_code == 200
    return response.json()


def _date_from_iso(value: str) -> date:
    return date.fromisoformat(value)


@pytest.fixture(scope="module")
def http() -> requests.Session:
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(http: requests.Session) -> str:
    response = http.post(f"{API}/admin/verify", json={"password": "admin2026"}, timeout=30)
    assert response.status_code == 200
    payload = response.json()
    assert payload.get("ok") is True
    token = payload.get("token")
    assert isinstance(token, str) and token
    return token


@pytest.fixture(scope="module")
def mongo_state(http: requests.Session):
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
    original_doc = collection.find_one({"_id": "production"})
    original_doc_copy = deepcopy(original_doc) if original_doc is not None else None

    report_before = http.get(f"{API}/report/molds", timeout=60)
    assert report_before.status_code == 200
    baseline_report = report_before.json()

    with open("/tmp/capacity-project-before.json", "w", encoding="utf-8") as fp:
        json.dump(baseline_report, fp, ensure_ascii=False, indent=2)
    with open("/tmp/capacity-before.json", "w", encoding="utf-8") as fp:
        json.dump(_get_schedule(http), fp, ensure_ascii=False, indent=2)
    with open("/tmp/capacity-schedule-original.json", "w", encoding="utf-8") as fp:
        json.dump(original_doc_copy, fp, ensure_ascii=False, indent=2, default=str)

    yield {
        "collection": collection,
        "client": client,
        "original_doc": original_doc_copy,
        "baseline_report": baseline_report,
    }

    if original_doc_copy is None:
        collection.delete_one({"_id": "production"})
    else:
        collection.replace_one({"_id": "production"}, original_doc_copy, upsert=True)

    restored_report_resp = http.get(f"{API}/report/molds", timeout=60)
    assert restored_report_resp.status_code == 200
    restored_report = restored_report_resp.json()
    assert restored_report["total"] == baseline_report["total"]
    assert restored_report["con_molde"] == baseline_report["con_molde"]
    assert restored_report["sin_molde"] == baseline_report["sin_molde"]
    assert restored_report["model_total"] == baseline_report["model_total"]
    assert restored_report["model_unassigned"] == baseline_report["model_unassigned"]
    assert restored_report["project"]["total_panels"] == baseline_report["project"]["total_panels"]
    assert restored_report["project"]["assigned_panels"] == baseline_report["project"]["assigned_panels"]

    client.close()


# Module: quantity-first generated preview invariants and daily diagnostics
def test_preview_quantity_priority_invariants(http: requests.Session, mongo_state):
    mongo_state["collection"].delete_one({"_id": "production"})
    data = _get_schedule(http)

    assert data["saved"] is False
    assert data["revision"] == 0
    assert data["strategy"] == "daily_capacity_priority_v1"
    assert data["start_date"] == "2026-11-01"
    assert data["first_date"] == "2026-11-02"
    assert data["daily_capacity"] == 5
    assert data["schedulable"] == 526
    assert data["scheduled"] == 526
    assert data["unscheduled"] == 0
    assert data["manual_gap_days"] == 0
    assert data["working_day_span"] == 192
    assert data["finish_date"] == "2027-06-12"
    assert data["full_capacity_days"] == 79
    assert data["limited_capacity_days"] == 113
    assert data["bottleneck_mold"] in {"M04", "M-04"}
    assert data["bottleneck_panels"] == 172

    panels = data["panels"]
    assert len(panels) == 526
    names = [p["object_name"] for p in panels]
    assert len(set(names)) == 526
    assert all(p.get("date") for p in panels)

    used = set()
    by_day = {}
    for panel in panels:
        mold_day = (panel["date"], panel["molde"])
        assert mold_day not in used
        used.add(mold_day)
        by_day[panel["date"]] = by_day.get(panel["date"], 0) + 1

    for day in data["production_days"]:
        d = _date_from_iso(day["date"])
        scheduled = by_day.get(day["date"], 0)
        assert scheduled == day["scheduled"]
        if d.weekday() == 6:
            assert day["target"] == 0
            assert day["scheduled"] == 0
            assert day["status"] == "rest"
        else:
            assert day["target"] == data["daily_capacity"]
            assert day["scheduled"] <= data["daily_capacity"]
            assert day["scheduled"] == min(day["target"], day["available_molds"])


def test_production_diagnostics_expected_values_and_first_limited_jump(http: requests.Session):
    data = _get_schedule(http)
    days = data["production_days"]
    first_limited = next((d for d in days if d["status"] == "mold_limit"), None)
    assert first_limited is not None
    assert first_limited["date"] == "2027-02-02"
    assert first_limited["scheduled"] == 4
    assert first_limited["target"] == 5
    assert first_limited["available_molds"] == 4
    assert first_limited["shortfall"] == 1
    assert "Solo quedan 4 moldes distintos" in first_limited["explanation"]

    sunday = next(d for d in days if _date_from_iso(d["date"]).weekday() == 6)
    assert sunday["target"] == 0
    assert sunday["scheduled"] == 0
    assert sunday["status"] == "rest"
    assert "Domingo" in sunday["explanation"]


# Module: generate endpoint contract for quantity edits and strict input validation
def test_generate_capacity_sequence_3_5_8_1_persists(http: requests.Session, admin_token: str):
    current = _get_schedule(http)
    for capacity in [3, 5, 8, 1]:
        response = http.post(
            f"{API}/schedule/generate",
            json={"start_date": current["start_date"], "daily_capacity": capacity, "revision": current["revision"]},
            headers=_admin_headers(admin_token),
            timeout=90,
        )
        assert response.status_code == 200
        current = response.json()
        assert current["daily_capacity"] == capacity

        reloaded = _get_schedule(http)
        assert reloaded["daily_capacity"] == capacity
        assert reloaded["revision"] == current["revision"]


def test_generate_high_capacity_above_molds_is_valid_with_limited_days(http: requests.Session, admin_token: str):
    current = _get_schedule(http)
    response = http.post(
        f"{API}/schedule/generate",
        json={"start_date": current["start_date"], "daily_capacity": 20, "revision": current["revision"]},
        headers=_admin_headers(admin_token),
        timeout=120,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["daily_capacity"] == 20
    assert payload["limited_capacity_days"] > 0
    assert payload["full_capacity_days"] == 0


@pytest.mark.parametrize(
    "bad_payload",
    [
        {"start_date": "2026-11-01", "daily_capacity": 0, "revision": 0},
        {"start_date": "2026-11-01", "daily_capacity": -1, "revision": 0},
        {"start_date": "2026-11-01", "daily_capacity": 2.5, "revision": 0},
        {"start_date": "2026-11-01", "daily_capacity": 5.0, "revision": 0},
        {"start_date": "2026-11-01", "daily_capacity": 1001, "revision": 0},
    ],
)
def test_generate_rejects_non_integer_or_out_of_range_capacity(http: requests.Session, admin_token: str, bad_payload: dict):
    response = http.post(
        f"{API}/schedule/generate",
        json=bad_payload,
        headers=_admin_headers(admin_token),
        timeout=30,
    )
    assert response.status_code == 422


# Module: optimistic concurrency guarantees and no double-write with duplicate submit
def test_duplicate_fast_submit_same_revision_only_one_write_wins(http: requests.Session, admin_token: str):
    current = _get_schedule(http)
    payload = {
        "start_date": current["start_date"],
        "daily_capacity": current["daily_capacity"],
        "revision": current["revision"],
    }

    def _submit_once():
        return http.post(f"{API}/schedule/generate", json=payload, headers=_admin_headers(admin_token), timeout=90)

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = [future.result() for future in [pool.submit(_submit_once), pool.submit(_submit_once)]]

    statuses = sorted(resp.status_code for resp in responses)
    assert statuses == [200, 409]


def test_stale_revision_returns_409_without_silent_retry(http: requests.Session, admin_token: str):
    current = _get_schedule(http)
    ok = http.post(
        f"{API}/schedule/save",
        json={"revision": current["revision"]},
        headers=_admin_headers(admin_token),
        timeout=60,
    )
    assert ok.status_code == 200

    stale = http.post(
        f"{API}/schedule/save",
        json={"revision": current["revision"]},
        headers=_admin_headers(admin_token),
        timeout=30,
    )
    assert stale.status_code == 409


# Module: legacy strict-mode migration protection and unlock on apply/generate
def test_legacy_strict_schedule_blocks_save_move_until_migration(http: requests.Session, admin_token: str, mongo_state):
    base = _get_schedule(http)
    entries = [{"object_name": p["object_name"], "molde": p["molde"], "date": p["date"]} for p in base["panels"] if p.get("date")]
    mongo_state["collection"].replace_one(
        {"_id": "production"},
        {
            "_id": "production",
            "start_date": base["start_date"],
            "daily_capacity": base["daily_capacity"],
            "revision": max(1, base["revision"]),
            "strategy": "strict_floor_clockwise_v1",
            "entries": entries,
            "updated_at": "2026-01-01T00:00:00+00:00",
        },
        upsert=True,
    )

    legacy = _get_schedule(http)
    assert legacy["saved"] is True
    assert legacy["needs_replan"] is True
    assert legacy["strategy"] == "strict_floor_clockwise_v1"

    blocked_save = http.post(
        f"{API}/schedule/save",
        json={"revision": legacy["revision"]},
        headers=_admin_headers(admin_token),
        timeout=30,
    )
    assert blocked_save.status_code == 409

    panel = next(p for p in legacy["panels"] if p.get("date"))
    blocked_move = http.patch(
        f"{API}/schedule/panel",
        json={"object_name": panel["object_name"], "date": panel["date"], "revision": legacy["revision"]},
        headers=_admin_headers(admin_token),
        timeout=30,
    )
    assert blocked_move.status_code == 409

    migrate = http.post(
        f"{API}/schedule/generate",
        json={"start_date": legacy["start_date"], "daily_capacity": legacy["daily_capacity"], "revision": legacy["revision"]},
        headers=_admin_headers(admin_token),
        timeout=90,
    )
    assert migrate.status_code == 200
    migrated = migrate.json()
    assert migrated["strategy"] == "daily_capacity_priority_v1"
    assert migrated["needs_replan"] is False

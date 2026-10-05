"""Daily goal by panels or by m², and manual fabrication on Sundays (offline engine tests)."""
from collections import Counter
from datetime import date

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from scheduling.engine import move, plan
from scheduling.goal import Goal, as_goal
from scheduling.models import GenerateRequest
from scheduling.productivity import production_summary
from scheduling.resources import validate_resources

START = "2026-11-02"  # Monday
AREAS = [4.0, 6.5, 9.0, 12.0, 3.2, 7.7]
PANELS = {f"p{i:02d}": {"object_name": f"p{i:02d}", "molde": f"M{i % 4}", "sequence_index": i, "area": AREAS[i % 6]}
          for i in range(40)}


def by_day(entries):
    days = {}
    for e in entries:
        days.setdefault(e["date"], []).append(e)
    return days


def area(entries):
    return sum(PANELS[e["object_name"]]["area"] for e in entries)


def test_panels_goal_is_unchanged_and_skips_sundays():
    entries = plan(PANELS, START, 3)
    days = by_day(entries)
    assert all(len(v) <= 3 for v in days.values())
    assert all(date.fromisoformat(d).weekday() != 6 for d in days)
    assert plan(PANELS, START, as_goal(3)) == entries  # int and Goal are interchangeable


def test_area_goal_fills_each_day_until_the_goal_is_reached():
    goal = Goal("m2", 5, 20.0)
    entries = plan(PANELS, START, goal)
    days = by_day(entries)
    assert all(date.fromisoformat(d).weekday() != 6 for d in days)
    for items in days.values():
        biggest = max(PANELS[e["object_name"]]["area"] for e in items)
        assert area(items) - biggest < 20.0  # only the last panel may overshoot
    full = [d for d, items in days.items() if area(items) >= 20.0]
    assert len(full) >= len(days) - 2  # all but the days limited by molds / the final days
    validate_resources(PANELS, entries, START, goal)


def test_a_panel_bigger_than_the_area_goal_still_gets_scheduled():
    entries = plan(PANELS, START, Goal("m2", 5, 1.0))
    assert len(entries) == len(PANELS)
    assert all(len(items) <= 4 for items in by_day(entries).values())  # one per mold per day


def test_manual_move_to_sunday_is_allowed_and_respects_the_goal():
    entries = plan(PANELS, START, 2)
    sunday = date(2026, 11, 8)
    first, second, third = (PANELS[n] for n in ("p00", "p01", "p02"))
    moved = move(entries, first, sunday, START, 2, panels=PANELS)
    moved = move(moved, second, sunday, START, 2, panels=PANELS)
    assert Counter(e["date"] for e in moved)["2026-11-08"] == 2
    with pytest.raises(HTTPException) as full:
        move(moved, third, sunday, START, 2, panels=PANELS)
    assert full.value.status_code == 409
    validate_resources(PANELS, moved, START, 2)


def test_area_goal_blocks_a_move_only_when_the_day_already_met_it():
    goal = Goal("m2", 5, 10.0)
    sunday = date(2026, 11, 8)
    moved = move([], PANELS["p03"], sunday, START, goal, panels=PANELS)       # 12 m² >= 10: day closed
    with pytest.raises(HTTPException) as full:
        move(moved, PANELS["p01"], sunday, START, goal, panels=PANELS)
    assert full.value.status_code == 409 and "m²" in full.value.detail
    moved = move([], PANELS["p00"], sunday, START, goal, panels=PANELS)      # 4 m² < 10: still room
    assert len(move(moved, PANELS["p03"], sunday, START, goal, panels=PANELS)) == 2  # may overshoot with the last one


def test_fill_keeps_manual_sunday_entries():
    entries = plan(PANELS, START, 3)
    keep = move([e for e in entries if e["object_name"] != "p10"], PANELS["p10"], date(2026, 11, 8), START, 3, panels=PANELS)
    refilled = plan(PANELS, START, 3, fixed=keep)
    assert any(e["object_name"] == "p10" and e["date"] == "2026-11-08" for e in refilled)


def test_before_the_start_date_is_still_rejected():
    with pytest.raises(HTTPException) as early:
        move([], PANELS["p00"], date(2026, 11, 1), START, 3, panels=PANELS)
    assert early.value.status_code == 422


def test_sunday_status_in_the_production_summary():
    entries = plan(PANELS, START, 3)
    moved = move(entries, PANELS["p05"], date(2026, 11, 8), START, 3, panels=PANELS)
    days = {d["date"]: d for d in production_summary(PANELS, moved, START, 3)["production_days"]}
    assert days["2026-11-08"]["status"] == "sunday_manual" and days["2026-11-08"]["scheduled"] == 1
    empty = {d["date"]: d for d in production_summary(PANELS, entries, START, 3)["production_days"]}
    assert empty["2026-11-08"]["status"] == "rest" and "Domingo" in empty["2026-11-08"]["explanation"]
    area_days = production_summary(PANELS, plan(PANELS, START, Goal("m2", 5, 20.0)), START, Goal("m2", 5, 20.0))["production_days"]
    assert area_days[0]["target_area"] == 20.0 and area_days[0]["status"] == "full"


def test_generate_request_requires_the_value_of_the_chosen_unit():
    ok = GenerateRequest(revision=0, start_date=START, capacity_unit="m2", daily_area=12.345)
    assert ok.daily_area == 12.35 and ok.daily_capacity is None
    assert GenerateRequest(revision=0, start_date=START, daily_capacity=5).capacity_unit == "panels"
    for bad in ({"capacity_unit": "m2"}, {}, {"capacity_unit": "m2", "daily_area": 0}, {"capacity_unit": "kg", "daily_area": 5}):
        with pytest.raises(ValidationError):
            GenerateRequest(revision=0, start_date=START, **bad)

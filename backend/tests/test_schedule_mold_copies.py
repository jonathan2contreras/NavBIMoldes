"""Duplicated mold capacity is persisted with a recalculated, still resource-safe plan."""
import asyncio
from datetime import date
from types import SimpleNamespace
from collections import Counter
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from scheduling.engine import move, plan
from scheduling.models import MoldCopyRequest
from scheduling.resources import validate_resources
from scheduling.service import ScheduleService


PANELS = {f"p{i}": {"object_name": f"p{i}", "molde": "M-01", "sequence_index": i} for i in range(4)}
START = "2027-02-01"


def test_duplicate_reduces_fabrication_days_without_exceeding_daily_target():
    regular = plan(PANELS, START, 3)
    duplicated = plan(PANELS, START, 3, mold_copies={"M-01": 2})
    assert Counter(e["date"] for e in regular) == {
        "2027-02-01": 1, "2027-02-02": 1, "2027-02-03": 1, "2027-02-04": 1,
    }
    assert Counter(e["date"] for e in duplicated) == {"2027-02-01": 2, "2027-02-02": 2}
    validate_resources(PANELS, duplicated, START, 3, {"M-01": 2})
    with pytest.raises(HTTPException):
        validate_resources(PANELS, duplicated, START, 3)
    assert len(plan(PANELS, START, 1, mold_copies={"M-01": 2})) == 4


def test_move_uses_duplicate_capacity():
    entries = plan(PANELS, START, 3, mold_copies={"M-01": 2})
    moved = move(entries, PANELS["p2"], date.fromisoformat(START), START, 3, {"M-01": 3})
    assert Counter(e["date"] for e in moved)[START] == 3
    with pytest.raises(HTTPException):
        move(entries, PANELS["p2"], date.fromisoformat(START), START, 3, {"M-01": 2})


def test_copy_update_replans_and_preserves_revision_contract():
    service = ScheduleService(SimpleNamespace(production_schedules=None), None)
    record = {"start_date": START, "daily_capacity": 3, "revision": 4, "entries": plan(PANELS, START, 3)}
    source = {"panels": PANELS, "molds": [{"name": "M-01"}], "awaiting_location": 0}
    service.snapshot = AsyncMock(return_value=(source, record, record["entries"]))
    service.write = AsyncMock(return_value="saved")
    assert asyncio.run(service.set_mold_copies(MoldCopyRequest(mold="M-01", copies=2, revision=4))) == "saved"
    args = service.write.await_args.args
    assert args[1]["mold_copies"] == {"M-01": 2}
    assert args[3] == 4
    assert max(Counter(e["date"] for e in args[2]).values()) == 2
    assert "mold_copies" not in record  # Cancelled changes never touch the original record.
    with pytest.raises(HTTPException) as exc:
        asyncio.run(service.set_mold_copies(MoldCopyRequest(mold="unknown", copies=2, revision=4)))
    assert exc.value.status_code == 422
    with pytest.raises(ValidationError):
        MoldCopyRequest(mold="M-01", copies=1.5, revision=4)

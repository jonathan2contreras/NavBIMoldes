"""Installation week API regressions using an isolated, temporary Mongo collection."""
import os
import uuid
from copy import deepcopy

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pymongo import MongoClient

from scheduling.phases import PhaseStore, create_phase_router


@pytest.fixture
def client():
    mongo = MongoClient(os.environ.get("MONGO_URL", "mongodb://mongo:27017"))
    db = mongo[os.environ.get("DB_NAME", "bimtracker")]
    collection = db[f"test_installation_{uuid.uuid4().hex}"]
    plan = {"fronts": [{"id": "a", "name": "A", "color": "#E4572E"},
                       {"id": "b", "name": "B", "color": "#17BEBB"}],
            "items": [{"object_name": "p1", "front_id": "a", "week": "2027-02-15"},
                      {"object_name": "p2", "front_id": "b", "week": "2027-02-15"},
                      {"object_name": "p3", "front_id": "a", "week": "2027-02-15"},
                      {"object_name": "p4", "front_id": "a", "week": "2027-02-22"}]}
    collection.insert_one({"_id": "plan", **deepcopy(plan)})

    class AsyncCollection:
        async def find_one(self, *args, **kwargs):
            return collection.find_one(*args, **kwargs)

        async def update_one(self, *args, **kwargs):
            return collection.update_one(*args, **kwargs)

    store = PhaseStore(db)
    store.collection = AsyncCollection()

    app = FastAPI()
    app.include_router(create_phase_router(store, lambda: set()))
    try:
        with TestClient(app) as http:
            yield http, plan
    finally:
        collection.drop()
        mongo.close()


def move(http, new_week, **overrides):
    payload = {"front_id": "a", "week": "2027-02-15", "new_week": new_week, **overrides}
    return http.patch("/phases/week", json=payload)


def test_move_preserves_order_other_fronts_and_persists(client):
    http, plan = client
    response = move(http, "2027-03-03")
    assert response.status_code == 200
    expected = deepcopy(plan)
    for item in expected["items"]:
        if item["object_name"] in {"p1", "p3"}:
            item["week"] = "2027-03-01"
    assert response.json() == expected
    assert http.get("/phases").json() == expected


def test_occupied_destination_is_not_merged(client):
    http, plan = client
    assert move(http, "2027-02-22").status_code == 409
    assert http.get("/phases").json() == plan


def test_normalized_same_week_is_noop(client):
    http, plan = client
    assert move(http, "2027-02-18").json() == plan


def test_missing_or_stale_source_is_rejected(client):
    http, _ = client
    assert move(http, "2027-03-01", front_id="missing").status_code == 404
    assert move(http, "2027-03-01").status_code == 200
    assert move(http, "2027-03-08").status_code == 404


def test_bad_date_is_rejected(client):
    http, plan = client
    assert move(http, "not-a-date").status_code == 422
    assert http.get("/phases").json() == plan


def test_move_without_login(client):
    http, _ = client
    response = http.patch("/phases/week", json={"front_id": "a", "week": "2027-02-15", "new_week": "2027-03-01"})
    assert response.status_code == 200
    assert http.get("/phases").json() == response.json()

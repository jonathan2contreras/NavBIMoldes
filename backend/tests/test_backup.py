"""Backup round trip against an isolated database; never modifies project data."""
import json
import uuid

import pytest
from bson import ObjectId
from fastapi import FastAPI
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

from backup import create_backup_router


@pytest.fixture
def backup_app(tmp_path):
    mongo = AsyncIOMotorClient("mongodb://mongo:27017")
    db = mongo[f"test_backup_{uuid.uuid4().hex}"]
    sync_mongo = MongoClient("mongodb://mongo:27017")
    sync_db = sync_mongo[db.name]
    assets = {"bimtracker/uploads/test.png": b"test image"}
    settings = {}
    (tmp_path / "facades.json").write_text('{"p1": "norte"}')
    (tmp_path / "dims.json").write_text('{"p1": [1, 2, 3]}')

    def get_object(path):
        return assets[path], "image/png"

    def put_object(path, data, content_type):
        assets[path] = data

    app = FastAPI()
    app.include_router(create_backup_router(db, tmp_path, get_object, put_object, settings.update))
    try:
        with TestClient(app) as http:
            yield http, sync_db, assets, settings
    finally:
        sync_mongo.drop_database(db.name)
        sync_mongo.close()
        mongo.close()


def test_round_trip_and_replace(backup_app):
    http, db, assets, settings = backup_app
    db.tags.insert_one({"_id": ObjectId(), "object_name": "p1", "molde": "M-01"})
    db.molds.insert_one({"_id": ObjectId(), "name": "M-01", "color": "#123456"})
    db.files.insert_one({"_id": ObjectId(), "storage_path": "bimtracker/uploads/test.png"})
    backup = http.get("/backup")
    assert backup.status_code == 200
    data = json.loads(backup.content)
    assert data["format"] == "bimtracker-backup"
    assert data["attachments"]["bimtracker/uploads/test.png"]["data"]
    db.tags.delete_many({})
    db.molds.insert_one({"name": "M-OLD", "color": "#999999"})
    assets.clear()
    result = http.post("/backup", files={"file": ("backup.json", backup.content, "application/json")})
    assert result.status_code == 200, result.text
    assert db.tags.find_one({"object_name": "p1"})["molde"] == "M-01"
    assert db.molds.count_documents({}) == 1
    assert assets["bimtracker/uploads/test.png"] == b"test image"
    assert settings["facades"] == {"p1": "norte"}


def test_invalid_backup_preserves_data(backup_app):
    http, db, _, _ = backup_app
    db.tags.insert_one({"object_name": "unchanged"})
    response = http.post("/backup", files={"file": ("bad.json", b'{"format":"other"}', "application/json")})
    assert response.status_code == 422
    assert db.tags.count_documents({}) == 1

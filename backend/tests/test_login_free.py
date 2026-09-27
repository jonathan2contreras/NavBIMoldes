"""Shared-password login: reads are public, writes need an admin token. No writes to project data."""
import os

import pytest
from fastapi.testclient import TestClient

from server import app

WRITES = [
    ("POST", "/api/molds"),
    ("PUT", "/api/tags"),
    ("POST", "/api/schedule/generate"),
    ("PATCH", "/api/phases/week"),
    ("PUT", "/api/project/panels"),
]


@pytest.mark.parametrize("method,path", WRITES)
def test_writes_rejected_without_login(method, path):
    response = TestClient(app).request(method, path, json={})
    assert response.status_code == 401


def test_wrong_password_rejected():
    response = TestClient(app).post("/api/auth/login", json={"password": "definitely-wrong"})
    assert response.status_code == 401


@pytest.mark.parametrize("method,path", WRITES)
def test_writes_reach_validation_with_login(method, path):
    client = TestClient(app)
    token = client.post("/api/auth/login", json={"password": os.environ["ADMIN_PASSWORD"]}).json()["token"]
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json() == {"admin": True}
    # Missing required fields must reach validation once logged in.
    response = client.request(method, path, json={}, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 422


def test_reads_stay_public():
    assert TestClient(app).get("/api/phases").status_code == 200

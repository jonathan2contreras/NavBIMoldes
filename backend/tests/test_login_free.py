"""Login-free routing regressions; no writes to project data."""
import pytest
from fastapi.testclient import TestClient

from server import app


@pytest.mark.parametrize("method,path", [
    ("POST", "/api/molds"),
    ("PUT", "/api/tags"),
    ("POST", "/api/schedule/generate"),
    ("PATCH", "/api/phases/week"),
    ("PUT", "/api/project/panels"),
])
def test_writes_reach_validation_without_login(method, path):
    # Missing required fields must reach validation, not a login check.
    response = TestClient(app).request(method, path, json={})
    assert response.status_code == 422


def test_password_endpoint_removed():
    response = TestClient(app).post("/api/admin/verify", json={"password": ""})
    assert response.status_code == 404


def test_no_auth_dependencies_remain():
    for route in app.routes:
        if hasattr(route, "dependant"):
            assert not route.dependant.dependencies, route.path

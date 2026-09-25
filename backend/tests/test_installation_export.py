"""Installation export never depends on fabrication eligibility or saved schedules."""
from copy import deepcopy

from fastapi import FastAPI
from fastapi.testclient import TestClient
from reportlab.platypus import PageBreak, Table

from scheduling.installation_export import (
    create_installation_export_router, installation_gantt_story, to_installation_gantt_pdf,
)


def plan():
    return {"fronts": [{"id": "a", "name": "Frente A & <Norte>", "color": "#E4572E"},
                       {"id": "b", "name": "Frente B", "color": "#17BEBB"}],
            "items": [{"front_id": "a", "week": "2027-02-15", "object_name": "p1"},
                      {"front_id": "a", "week": "2027-02-15", "object_name": "p2"},
                      {"front_id": "b", "week": "2027-02-22", "object_name": "p3"}]}


def test_front_rows_week_columns_and_counts():
    data = plan()
    before = deepcopy(data)
    tables = [item for item in installation_gantt_story(data) if isinstance(item, Table)]
    assert len(tables) == 1
    rows = tables[0]._cellvalues
    assert rows[0][1] == "15/02/2027\nal 20/02"
    assert rows[1][1:3] == ["2 paneles", ""]
    assert rows[2][1:3] == ["", "1 paneles"]
    assert rows[3][1:3] == ["2", "1"]
    assert data == before
    assert to_installation_gantt_pdf(data).startswith(b"%PDF-")


def test_empty_plan_generates_readable_pdf():
    data = {"fronts": [], "items": []}
    story = installation_gantt_story(data)
    assert "No hay paneles" in story[1].getPlainText()
    assert to_installation_gantt_pdf(data).startswith(b"%PDF-")


def test_skips_empty_blocks_but_keeps_week_spacing():
    data = plan()
    data["items"].append({"front_id": "a", "week": "2027-08-02", "object_name": "p4"})
    story = installation_gantt_story(data)
    assert sum(isinstance(item, Table) for item in story) == 2
    assert sum(isinstance(item, PageBreak) for item in story) == 1


def test_endpoint_uses_current_installation_plan():
    data = plan()

    class Store:
        async def read(self):
            return data

    app = FastAPI()
    app.include_router(create_installation_export_router(Store()))
    with TestClient(app) as client:
        response = client.get("/phases/export-gantt.pdf")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert 'attachment; filename="gantt_instalacion_' in response.headers["content-disposition"]
        assert response.headers["cache-control"] == "no-store"
        assert response.content.startswith(b"%PDF-")

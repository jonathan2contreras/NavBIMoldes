"""Installation export never depends on fabrication eligibility or saved schedules."""
import base64
from copy import deepcopy
from io import BytesIO
import re

from PIL import Image

from fastapi import FastAPI
from fastapi.testclient import TestClient
from reportlab.platypus import Table

from scheduling.installation_export import (
    create_installation_export_router, facade_thumbnails, installation_gantt_story, to_installation_gantt_pdf,
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


def test_skips_empty_blocks_but_keeps_week_spacing_on_one_page():
    data = plan()
    data["items"].append({"front_id": "a", "week": "2027-08-02", "object_name": "p4"})
    story = installation_gantt_story(data)
    tables = [item for item in story if isinstance(item, Table)]
    assert len(tables) == 1
    assert len(tables[0]._cellvalues[0]) == 17  # Two occupied eight-week blocks.
    assert tables[0]._cellvalues[1][9] == "1 paneles"
    pdf = to_installation_gantt_pdf(data)
    assert len(re.findall(rb"/Type\s*/Page\b", pdf)) == 1


def test_many_fronts_still_fit_one_page():
    data = plan()
    data["fronts"] = [{"id": str(i), "name": f"Frente {i}", "color": "#17BEBB"} for i in range(50)]
    data["items"] = [{"front_id": str(i), "week": "2027-02-15"} for i in range(50)]
    assert len(re.findall(rb"/Type\s*/Page\b", to_installation_gantt_pdf(data))) == 1


def test_four_model_views_below_gantt_on_one_page():
    images = {}
    for index, key in enumerate(("norte", "sur", "este", "oeste")):
        picture = BytesIO()
        Image.new("RGBA", (640, 480), (140 + index * 20, 180, 210, 0)).save(picture, format="PNG")
        images[key] = "data:image/png;base64," + base64.b64encode(picture.getvalue()).decode()
    data = plan()
    story = installation_gantt_story(data)
    assert len([item for item in story if isinstance(item, Table)]) == 1
    thumbnail_table = facade_thumbnails(images)[-1]
    assert len(thumbnail_table._cellvalues) == 2
    assert thumbnail_table._colWidths[0] > 9 * 28  # Each image is wider than 9 cm.
    pdf = to_installation_gantt_pdf(data, images)
    assert len(re.findall(rb"/Type\s*/Page\b", pdf)) == 1
    assert len(re.findall(rb"/Subtype\s*/Image\b", pdf)) >= 4
    assert b"/SMask" in pdf  # Transparent PNGs retain their alpha channel.

    class Store:
        async def read(self):
            return data

    app = FastAPI()
    app.include_router(create_installation_export_router(Store()))
    with TestClient(app) as client:
        response = client.post("/phases/export-gantt.pdf", json={"images": images})
        assert response.status_code == 200
        assert len(re.findall(rb"/Type\s*/Page\b", response.content)) == 1
        assert client.post("/phases/export-gantt.pdf", json={"images": {}}).status_code == 422


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

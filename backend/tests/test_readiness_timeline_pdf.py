"""El informe conserva sus tablas y añade exactamente una hoja horizontal de hitos."""
from datetime import date, timedelta
import re

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
from reportlab.lib.pagesizes import A4, landscape

from scheduling.readiness_timeline_pdf import ProductionTimeline, build_readiness_pdf
from scheduling.report_exports import ReadinessPayload, readiness_story, create_report_exports_router


def payload(count=11, same_day=False):
    start = date(2026, 12, 14)
    return ReadinessPayload(
        start_date=start.isoformat(),
        finish_date=(start + timedelta(days=100)).isoformat(),
        rows=[dict(name=f"M-{i:03}", first=(start + timedelta(days=0 if same_day else i)).isoformat(),
                   last=(start + timedelta(days=100)).isoformat(), color="#007AFF") for i in range(count)],
    )


def page_sizes(pdf):
    return [(float(w), float(h)) for w, h in re.findall(rb"/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]", pdf)]


@pytest.mark.parametrize("count,same_day", [(1, True), (11, False), (80, False), (80, True)])
def test_adds_one_landscape_page_without_splitting_timeline(count, same_day):
    data = payload(count, same_day)
    pdf = build_readiness_pdf(readiness_story(data), data)
    sizes = page_sizes(pdf)
    assert len(sizes) >= 2
    assert sizes[-1] == pytest.approx(landscape(A4), abs=0.01)
    assert all(size == pytest.approx(A4, abs=0.01) for size in sizes[:-1])
    chart = ProductionTimeline(data.rows, data.start_date, data.finish_date, 750, 390)
    assert chart.width <= 750
    assert chart.height <= 390
    names = [paragraph.getPlainText() for column in chart.columns for paragraph, _, color in column if color is not None]
    assert sorted(names) == sorted(row.name for row in data.rows)


def test_same_day_start_finish_and_escaped_names():
    data = ReadinessPayload(start_date="2026-12-14", finish_date="2026-12-14", rows=[
        dict(name="Molde <A> & B", first="2026-12-14", last="2026-12-14")])
    chart = ProductionTimeline(data.rows, data.start_date, data.finish_date, 750, 390)
    assert chart.dates == ["2026-12-14"]
    assert chart.columns[0][-1][0].getPlainText() == "Molde <A> & B"
    assert len(page_sizes(build_readiness_pdf(readiness_story(data), data))) == 2


def test_duplicate_mold_is_labeled_without_repeating_its_milestone():
    data = ReadinessPayload(start_date="2026-12-14", finish_date="2026-12-15", rows=[
        dict(name="Molde <A> & B", first="2026-12-14", last="2026-12-15", copies=3),
        dict(name="M-02", first="2026-12-15", last="2026-12-15"),
    ])
    chart = ProductionTimeline(data.rows, data.start_date, data.finish_date, 750, 390)
    labels = [paragraph.getPlainText() for column in chart.columns for paragraph, _, color in column if color is not None]
    assert labels == ["Molde <A> & B · 3 copias", "M-02"]
    assert len(page_sizes(build_readiness_pdf(readiness_story(data), data))) == 2


def test_empty_report_does_not_add_blank_timeline_page():
    data = ReadinessPayload()
    assert len(page_sizes(build_readiness_pdf(readiness_story(data), data))) == 1


def test_export_endpoint_returns_complete_pdf():
    app = FastAPI()
    app.include_router(create_report_exports_router())
    with TestClient(app) as client:
        response = client.post("/reports/mold-readiness.pdf", json=payload().model_dump())
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment;" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF-")
    assert len(page_sizes(response.content)) == 2

"""Schedule exports can be one continuous sheet or several sheets/pages."""
import re
from datetime import date, timedelta
from io import BytesIO

import pytest
from openpyxl import load_workbook

from scheduling.export import MAX_PAGE, build_tables, to_gantt_pdf, to_pdf, to_xlsx


def pages(pdf):
    return len(re.findall(rb"/Type\s*/Page\b", pdf))


def media_boxes(pdf):
    return [(float(w), float(h)) for w, h in re.findall(rb"/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]", pdf)]


def schedule(days=60, per_day=3):
    start = date(2027, 2, 1)
    panels = [{"object_name": f"p{d}-{i}", "molde": f"M-{i + 1:02}", "date": (start + timedelta(days=d)).isoformat(),
               "code": f"P{d}{i} [1 panel]", "color": "#E4572E", "area": 5.5, "tipo": "Liso", "facade_label": "Norte",
               "floor_label": "P1", "front": None, "week": None}
              for d in range(days) for i in range(per_day) if (start + timedelta(days=d)).weekday() != 6]
    return {"panels": panels, "start_date": start.isoformat(), "first_date": start.isoformat(),
            "finish_date": (start + timedelta(days=days - 1)).isoformat(), "daily_capacity": per_day, "scheduled": len(panels),
            "unscheduled": 0, "molds": [{"name": f"M-{i + 1:02}", "color": "#E4572E", "scheduled": days, "total": days, "copies": 1}
                                        for i in range(per_day)]}


def test_excel_default_keeps_three_sheets():
    wb = load_workbook(BytesIO(to_xlsx(*build_tables(schedule()))))
    assert wb.sheetnames == ["Resumen", "Cronograma", "Plan de instalación"]


def test_excel_continuous_is_a_single_sheet_with_every_section():
    summary, rows, plan = build_tables(schedule())
    wb = load_workbook(BytesIO(to_xlsx(summary, rows, plan, layout="continuous")))
    assert wb.sheetnames == ["Cronograma"]
    cells = [row[0] for row in wb["Cronograma"].iter_rows(values_only=True)]
    assert cells.index("Resumen") < cells.index("Cronograma") < cells.index("Plan de instalación")
    values = [v for row in wb["Cronograma"].iter_rows(values_only=True) for v in row]
    assert "Inicio" in values and "Fecha" in values and "Orden" in values  # summary, schedule and plan headers
    assert sum(1 for row in wb["Cronograma"].iter_rows(values_only=True) if row[2] == "M-01") == len(rows) // 3  # all schedule rows are there


def test_pdf_default_has_a_page_per_section_and_continuous_has_one_page():
    tables = build_tables(schedule(days=40))
    assert pages(to_pdf(*tables)) >= 3
    continuous = to_pdf(*tables, layout="continuous")
    assert pages(continuous) == 1
    (width, height), = media_boxes(continuous)
    assert height > 595 and height <= MAX_PAGE  # taller than landscape A4, within the viewer limit


def test_pdf_continuous_never_exceeds_the_page_limit():
    huge = build_tables(schedule(days=400, per_day=12))
    pdf = to_pdf(*huge, layout="continuous")
    assert all(h <= MAX_PAGE for _, h in media_boxes(pdf))
    assert pages(pdf) >= 1


def test_gantt_default_has_a_sheet_per_two_weeks_and_continuous_has_one():
    data = schedule(days=60)
    assert pages(to_gantt_pdf(data)) == 5  # 60 days / 14 days per sheet
    continuous = to_gantt_pdf(data, layout="continuous")
    assert pages(continuous) == 1
    (width, height), = media_boxes(continuous)
    assert width > 841.9 * 3  # one wide sheet holding every day


def test_gantt_continuous_keeps_empty_weeks_and_splits_only_past_the_viewer_limit():
    data = schedule(days=20)
    data["panels"] = [p for p in data["panels"] if p["date"] < "2027-02-04" or p["date"] > "2027-02-17"]
    assert pages(to_gantt_pdf(data)) == 2                      # the empty two-week block is skipped
    assert pages(to_gantt_pdf(data, layout="continuous")) == 1  # continuous keeps the gap
    long = schedule(days=600, per_day=2)
    pdf = to_gantt_pdf(long, layout="continuous")
    assert pages(pdf) >= 2 and all(w <= MAX_PAGE for w, _ in media_boxes(pdf))

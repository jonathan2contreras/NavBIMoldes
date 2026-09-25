"""Fabrication PDF labels mirror the on-screen Gantt."""
import re
from unittest.mock import patch

from reportlab.platypus import Table

from scheduling.export import to_gantt_pdf


def test_fabrication_pdf_labels_match_timeline():
    data = {
        "panels": [{"molde": "M-01 & Norte", "date": "2027-02-15", "code": "C1 & C2 [2 paneles]",
                    "color": "#E4572E", "area": 12.5}],
        "molds": [{"name": "M-01 & Norte", "color": "#E4572E", "scheduled": 1,
                   "total": 3, "tipo": "Liso"}],
        "first_date": "2027-02-15", "finish_date": "2027-02-15", "daily_capacity": 5,
    }
    with patch("scheduling.export.SimpleDocTemplate.build") as build:
        to_gantt_pdf(data)
    table = next(part for part in build.call_args.args[0] if isinstance(part, Table))
    rows = table._cellvalues
    assert "Programados / total" in rows[0][0].getPlainText()
    assert "feb" in rows[0][1].getPlainText()
    assert "M-01 & Norte" in rows[1][0].getPlainText()
    assert "1 / 3 · Liso" in rows[1][0].getPlainText()
    assert rows[1][1].getPlainText() == "C1 & C22 paneles12,5 m²"
    assert rows[-2][1] == "1 / 5"
    assert rows[-1][1] == "12,5 m²"
    assert rows[-2][7] == "0 / 0"  # Sunday has no production capacity.
    pdf = to_gantt_pdf(data)
    assert len(re.findall(rb"/Type\s*/Page\b", pdf)) == 1


def test_duplicate_molds_show_each_panel_and_full_daily_totals():
    data = {
        "panels": [
            {"molde": "M-01", "date": "2027-02-15", "code": f"P{i}", "area": i + 1}
            for i in range(3)
        ],
        "molds": [{"name": "M-01", "color": "#E4572E", "scheduled": 3,
                   "total": 3, "copies": 3}],
        "first_date": "2027-02-15", "finish_date": "2027-02-15", "daily_capacity": 5,
    }
    with patch("scheduling.export.SimpleDocTemplate.build") as build:
        to_gantt_pdf(data)
    table = next(part for part in build.call_args.args[0] if isinstance(part, Table))
    rows = table._cellvalues
    assert [row[0].getPlainText() for row in rows[1:4]] == ["M-013 / 3 · Sin tipo", "M-01 · copia 2", "M-01 · copia 3"]
    assert [row[1].getPlainText() for row in rows[1:4]] == ["P01 panel1 m²", "P11 panel2 m²", "P21 panel3 m²"]
    assert rows[-2][1] == "3 / 5"
    assert rows[-1][1] == "6 m²"
    assert len(re.findall(rb"/Type\s*/Page\b", to_gantt_pdf(data))) == 1


def test_tall_blocks_fit_one_sheet_each_without_splitting_rows():
    data = {
        "panels": [{"molde": "M-01", "date": day, "code": day, "area": 1}
                   for day in ("2027-02-15", "2027-03-01")],
        "molds": [{"name": f"M-{i:02}", "color": "#E4572E", "scheduled": 2 if i == 1 else 0,
                   "total": 2, "copies": 3} for i in range(1, 26)],
        "first_date": "2027-02-15", "finish_date": "2027-03-01", "daily_capacity": 5,
    }
    pdf = to_gantt_pdf(data)
    assert len(re.findall(rb"/Type\s*/Page\b", pdf)) == 2
    heights = [float(height) for height in re.findall(rb"/MediaBox\s*\[\s*0\s+0\s+[\d.]+\s+([\d.]+)\s*\]", pdf)]
    assert heights and all(height > 595 for height in heights)  # Taller than landscape A4.

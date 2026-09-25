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

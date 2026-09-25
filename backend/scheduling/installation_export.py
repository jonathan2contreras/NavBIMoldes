"""Installation-only Gantt export, read directly from the saved phase plan."""
import base64
import binascii
from collections import Counter
from datetime import date, timedelta
from io import BytesIO
from xml.sax.saxutils import escape

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

WEEKS_PER_BLOCK = 8
WEEK_WIDTH = 2.6 * cm
FRONT_WIDTH = 4 * cm


def installation_gantt_story(plan):
    styles = getSampleStyleSheet()
    label = styles["BodyText"].clone("front", fontSize=9, leading=11)
    fronts = plan["fronts"]
    ids = {front["id"] for front in fronts}
    items = [item for item in plan["items"] if item["front_id"] in ids]
    story = []
    title = "Gantt · Cronograma de instalación"
    if not items:
        return [Paragraph(title, styles["Title"]), Paragraph("No hay paneles en el plan de instalación.", styles["Normal"])]
    counts = Counter((item["front_id"], item["week"]) for item in items)
    dates = sorted({date.fromisoformat(item["week"]) for item in items})
    start = dates[0]
    # Keep the former empty-block filtering, but put every occupied block on one sheet.
    blocks = sorted({(day - start).days // (7 * WEEKS_PER_BLOCK) for day in dates})
    weeks = [start + timedelta(weeks=block * WEEKS_PER_BLOCK + i)
             for block in blocks for i in range(WEEKS_PER_BLOCK)]
    front_weeks = {front["id"]: sorted({item["week"] for item in items if item["front_id"] == front["id"]}) for front in fronts}
    story.extend([
        Paragraph(title, styles["Title"]),
        Paragraph(f"{weeks[0]:%d/%m/%Y} – {weeks[-1] + timedelta(days=5):%d/%m/%Y}", styles["Heading3"]),
        Paragraph(f"Plan completo: {len(items)} paneles · Semanas de lunes a sábado · Generado el {date.today():%d/%m/%Y}", styles["Normal"]),
        Spacer(1, 12),
    ])
    rows = [["Frente / semana"] + [f"{week:%d/%m/%Y}\nal {(week + timedelta(days=5)):%d/%m}" for week in weeks]]
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1C1C1E")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C7C7CC")),
    ]
    for row_index, front in enumerate(fronts, 1):
        row = [Paragraph(escape(front["name"]), label)]
        base = colors.HexColor(front["color"])
        for column, week in enumerate(weeks, 1):
            key = week.isoformat()
            count = counts[(front["id"], key)]
            row.append(f"{count} paneles" if count else "")
            if count:
                amount = min(front_weeks[front["id"]].index(key) * 0.22, 0.66)
                fill = colors.Color(*(c + (1 - c) * amount for c in (base.red, base.green, base.blue)))
                commands.extend([("BACKGROUND", (column, row_index), (column, row_index), fill),
                                 ("FONTNAME", (column, row_index), (column, row_index), "Helvetica-Bold")])
        rows.append(row)
    rows.append(["Total paneles"] + [str(sum(counts[(f["id"], week.isoformat())] for f in fronts)) for week in weeks])
    commands.extend([("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#F2F2F7")),
                     ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold")])
    table = Table(rows, colWidths=[FRONT_WIDTH] + [WEEK_WIDTH] * len(weeks), repeatRows=1)
    table.setStyle(TableStyle(commands))
    story.append(table)
    return story


FACADES = (("norte", "Norte"), ("sur", "Sur"), ("este", "Este"), ("oeste", "Oeste"))


class FacadeCaptures(BaseModel):
    images: dict[str, str]


def facade_thumbnails(images):
    if set(images) != {key for key, _ in FACADES}:
        raise HTTPException(422, "Se requieren las cuatro fachadas del modelo.")
    styles = getSampleStyleSheet()
    cells = []
    for key, label in FACADES:
        value = images[key]
        if not value.startswith("data:image/png;base64,") or len(value) > 5_000_000:
            raise HTTPException(422, f"Imagen inválida: {label}.")
        try:
            raw = base64.b64decode(value.split(",", 1)[1], validate=True)
            if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
                raise ValueError("Not PNG")
            image = Image(BytesIO(raw), width=7 * cm, height=5.25 * cm)
        except (ValueError, binascii.Error, OSError) as exc:
            raise HTTPException(422, f"Imagen inválida: {label}.") from exc
        cells.append([Paragraph(f"Fachada {label} · vista isométrica", styles["BodyText"]), Spacer(1, 8), image])
    thumbnails = Table([[cells[0], "", cells[1], "", cells[2], "", cells[3]]],
                       colWidths=[7 * cm, cm, 7 * cm, cm, 7 * cm, cm, 7 * cm], hAlign="CENTER")
    thumbnails.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    return [Spacer(1, 18), Paragraph("Modelo completo · cuatro fachadas", styles["Heading2"]), thumbnails]


def to_installation_gantt_pdf(plan, images=None):
    story = installation_gantt_story(plan)
    if images is not None:
        story.extend(facade_thumbnails(images))
    tables = [part for part in story if isinstance(part, Table)]
    table_width = max((sum(table._colWidths) for table in tables), default=0)
    page_width = max(landscape(A4)[0], table_width + 2 * cm + 12)
    available_width = page_width - 2 * cm - 12  # ReportLab frames have 6pt padding on each side.
    content_height = sum(part.wrap(available_width, 100000)[1] + part.getSpaceBefore() + part.getSpaceAfter()
                         for part in story)
    page_height = max(landscape(A4)[1], content_height + 2.5 * cm + 36)
    output = BytesIO()
    doc = SimpleDocTemplate(output, pagesize=(page_width, page_height), leftMargin=cm, rightMargin=cm,
                            topMargin=cm, bottomMargin=1.5 * cm, title="Gantt de instalación")

    def footer(canvas, document):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(page_width - cm, 0.7 * cm, f"Página {document.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer)
    return output.getvalue()


def create_installation_export_router(store):
    router = APIRouter(prefix="/phases", tags=["Instalación"])

    async def pdf_response(images=None):
        plan = await store.read()
        return Response(to_installation_gantt_pdf(plan, images), media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="gantt_instalacion_{date.today().isoformat()}.pdf"',
                                 "Cache-Control": "no-store"})

    @router.get("/export-gantt.pdf")
    async def export_installation_gantt():
        return await pdf_response()

    @router.post("/export-gantt.pdf")
    async def export_installation_gantt_with_model(captures: FacadeCaptures):
        return await pdf_response(captures.images)

    return router

"""Installation-only Gantt export, read directly from the saved phase plan."""
from collections import Counter
from datetime import date, timedelta
from io import BytesIO
from xml.sax.saxutils import escape

from fastapi import APIRouter
from fastapi.responses import Response
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

WEEKS_PER_PAGE = 8


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
    # Visit only occupied calendar blocks, retaining empty week columns within each block.
    blocks = sorted({(day - start).days // (7 * WEEKS_PER_PAGE) for day in dates})
    front_weeks = {front["id"]: sorted({item["week"] for item in items if item["front_id"] == front["id"]}) for front in fronts}
    for index, block in enumerate(blocks):
        if index:
            story.append(PageBreak())
        first = start + timedelta(weeks=block * WEEKS_PER_PAGE)
        weeks = [first + timedelta(weeks=i) for i in range(WEEKS_PER_PAGE)]
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
        width = landscape(A4)[0] - 2 * cm
        table = Table(rows, colWidths=[4 * cm] + [(width - 4 * cm) / WEEKS_PER_PAGE] * WEEKS_PER_PAGE, repeatRows=1)
        table.setStyle(TableStyle(commands))
        story.append(table)
    return story


def to_installation_gantt_pdf(plan):
    output = BytesIO()
    doc = SimpleDocTemplate(output, pagesize=landscape(A4), leftMargin=cm, rightMargin=cm,
                            topMargin=cm, bottomMargin=1.5 * cm, title="Gantt de instalación")

    def footer(canvas, document):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(landscape(A4)[0] - cm, 0.7 * cm, f"Página {document.page}")
        canvas.restoreState()

    doc.build(installation_gantt_story(plan), onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()


def create_installation_export_router(store):
    router = APIRouter(prefix="/phases", tags=["Instalación"])

    @router.get("/export-gantt.pdf")
    async def export_installation_gantt():
        plan = await store.read()
        return Response(to_installation_gantt_pdf(plan), media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="gantt_instalacion_{date.today().isoformat()}.pdf"',
                                 "Cache-Control": "no-store"})

    return router

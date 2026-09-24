"""Shareable exports (Excel / PDF) of the current schedule and the installation plan."""
from datetime import date as CalendarDate
from io import BytesIO

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
SCHEDULE_HEAD = ["Fecha", "Día", "Molde", "Panel", "Tipo", "Fachada", "Planta", "Frente", "Semana", "m²"]
PLAN_HEAD = ["Orden", "Frente", "Semana", "Panel", "Molde", "Tipo", "Fachada", "Fecha programada", "m²"]


def fmt(value):
    return CalendarDate.fromisoformat(value).strftime("%d/%m/%Y") if value else "Sin fecha"


def build_tables(data):
    """Summary, schedule rows (by date) and installation plan rows (by selection order)."""
    panels = data["panels"]
    scheduled = sorted((p for p in panels if p.get("date")), key=lambda p: (p["date"], p["molde"], p["code"]))
    schedule_rows = [[fmt(p["date"]), DAYS[CalendarDate.fromisoformat(p["date"]).weekday()], p["molde"], p["code"],
                      p.get("tipo") or "", p.get("facade_label") or "", p.get("floor_label") or "",
                      p.get("front") or "", fmt(p["week"]) if p.get("week") else "", p.get("area") or 0]
                     for p in scheduled]
    plan = sorted((p for p in panels if p.get("front")), key=lambda p: p["phase_order"])
    plan_rows = [[i + 1, p["front"], fmt(p["week"]), p["code"], p["molde"], p.get("tipo") or "",
                  p.get("facade_label") or "", fmt(p.get("date")), p.get("area") or 0]
                 for i, p in enumerate(plan)]
    area = round(sum(p.get("area") or 0 for p in scheduled), 2)
    summary = [["Inicio", fmt(data.get("start_date"))], ["Primera fecha", fmt(data.get("first_date"))],
               ["Fecha final", fmt(data.get("finish_date"))], ["Objetivo diario", f"{data.get('daily_capacity')} paneles/día"],
               ["Paneles programados", data.get("scheduled", 0)], ["Paneles sin fecha", data.get("unscheduled", 0)],
               ["Paneles en plan de instalación", len(plan_rows)], ["m² programados", area]]
    return summary, schedule_rows, plan_rows


def to_xlsx(summary, schedule_rows, plan_rows):
    wb = Workbook()
    bold, fill = Font(bold=True, color="FFFFFF"), PatternFill("solid", fgColor="1C1C1E")
    sheets = [("Resumen", ["Dato", "Valor"], summary), ("Cronograma", SCHEDULE_HEAD, schedule_rows),
              ("Plan de instalación", PLAN_HEAD, plan_rows)]
    for index, (title, head, rows) in enumerate(sheets):
        ws = wb.active if index == 0 else wb.create_sheet()
        ws.title = title
        ws.append(head)
        for cell in ws[1]:
            cell.font, cell.fill = bold, fill
        for row in rows:
            ws.append(row)
        ws.freeze_panes = "A2"
        for column in ws.columns:
            ws.column_dimensions[column[0].column_letter].width = min(max(len(str(c.value or "")) for c in column) + 2, 40)
    out = BytesIO()
    wb.save(out)
    return out.getvalue()


def pdf_table(head, rows):
    rows = rows or [["—"] + [""] * (len(head) - 1)]
    table = Table([head] + [[str(v) for v in r] for r in rows], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1C1C1E")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F2F2F7")]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#C7C7CC")),
    ]))
    return table


def to_pdf(summary, schedule_rows, plan_rows):
    out = BytesIO()
    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(out, pagesize=landscape(A4), leftMargin=1.2 * cm, rightMargin=1.2 * cm,
                            topMargin=1.2 * cm, bottomMargin=1.2 * cm, title="Cronograma y plan de instalación")
    doc.build([
        Paragraph("Cronograma y plan de instalación", styles["Title"]),
        Paragraph(f"Generado el {CalendarDate.today().strftime('%d/%m/%Y')}", styles["Normal"]), Spacer(1, 10),
        pdf_table(["Dato", "Valor"], summary), PageBreak(),
        Paragraph("Cronograma", styles["Heading2"]), pdf_table(SCHEDULE_HEAD, schedule_rows), PageBreak(),
        Paragraph("Plan de instalación", styles["Heading2"]), pdf_table(PLAN_HEAD, plan_rows),
    ])
    return out.getvalue()


FORMATS = {"xlsx": (to_xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
           "pdf": (to_pdf, "application/pdf")}


def create_export_router(service):
    router = APIRouter(prefix="/schedule", tags=["Cronograma"])

    @router.get("/export.{kind}")
    async def export_schedule(kind: str):
        if kind not in FORMATS:
            raise HTTPException(404, "Formato no soportado")
        data = await service.get()
        data = data.model_dump() if hasattr(data, "model_dump") else data
        build, media = FORMATS[kind]
        name = f"cronograma_{CalendarDate.today().isoformat()}.{kind}"
        return StreamingResponse(BytesIO(build(*build_tables(data))), media_type=media,
                                 headers={"Content-Disposition": f'attachment; filename="{name}"'})

    return router

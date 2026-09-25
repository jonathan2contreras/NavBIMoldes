"""PDF de los plazos de moldes y del análisis de cumplimiento.

El frontend ya calcula ambas vistas, así que envía las filas resueltas y aquí solo
se maquetan. Así el PDF coincide siempre con lo que se ve en pantalla, igual que
hace la exportación del Gantt de instalación.
"""
from datetime import date as CalendarDate, timedelta
from io import BytesIO

from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel, Field
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def fmt(value):
    return CalendarDate.fromisoformat(value).strftime("%d/%m/%Y") if value else "—"


def week_span(value):
    """Lunes a sábado de la semana de instalación."""
    if not value:
        return "—"
    start = CalendarDate.fromisoformat(value)
    return f"{start:%d/%m/%Y} – {start + timedelta(days=5):%d/%m/%Y}"


def pdf_table(head, rows, widths=None):
    rows = rows or [["—"] + [""] * (len(head) - 1)]
    table = Table([head] + [[str(v) for v in r] for r in rows], colWidths=widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1C1C1E")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F2F2F7")]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#C7C7CC")),
    ]))
    return table


def swatch(color):
    return colors.HexColor(color) if isinstance(color, str) and len(color) == 7 else colors.HexColor("#8E8E93")


# ---------- Plazos de moldes ----------

READINESS_HEAD = ["Molde", "Tipo", "Listo antes del", "Última fabricación", "Días", "Paneles", "m²"]
READINESS_WIDTHS = [3.4 * cm, 2.6 * cm, 3.0 * cm, 3.2 * cm, 1.2 * cm, 2.4 * cm, 1.6 * cm]


class ReadinessRow(BaseModel):
    name: str
    tipo: str | None = None
    color: str | None = None
    first: str
    last: str
    days: int = 0
    panels: int = 0
    total: int = 0
    area: float = 0


class PendingMold(BaseModel):
    name: str
    tipo: str | None = None


class ReadinessPayload(BaseModel):
    rows: list[ReadinessRow] = Field(default_factory=list)
    pending: list[PendingMold] = Field(default_factory=list)
    start_date: str | None = None
    finish_date: str | None = None


def readiness_story(payload):
    styles = getSampleStyleSheet()
    story = [
        Paragraph("Plazos de moldes", styles["Title"]),
        Paragraph("Fechas en que cada molde debe estar operativo para cumplir el cronograma de fabricación",
                  styles["Normal"]),
        Spacer(1, 8),
    ]
    if not payload.rows:
        story.append(Paragraph(
            "Aún no hay moldes programados. Genera o guarda el cronograma en la pestaña Fabricación.", styles["Normal"]))
        return story
    area = round(sum(row.area for row in payload.rows), 2)
    story.append(Paragraph(
        f"Generado el {CalendarDate.today():%d/%m/%Y} &nbsp;·&nbsp; "
        f"Periodo de fabricación: {fmt(payload.start_date)} – {fmt(payload.finish_date)} &nbsp;·&nbsp; "
        f"{len(payload.rows)} moldes programados &nbsp;·&nbsp; {len(payload.pending)} sin fecha &nbsp;·&nbsp; "
        f"{area:g} m²", styles["Normal"]))
    story.append(Spacer(1, 8))
    rows, style = [], []
    for index, row in enumerate(payload.rows, 1):
        rows.append([row.name, row.tipo or "—", fmt(row.first), fmt(row.last), row.days,
                     f"{row.panels} / {row.total}", f"{row.area:g}"])
        style.append(("LINEBEFORE", (0, index), (0, index), 3, swatch(row.color)))
    table = pdf_table(READINESS_HEAD, rows, READINESS_WIDTHS)
    table.setStyle(TableStyle(style))
    story += [table, Spacer(1, 5), Paragraph("Paneles: programados / total del molde.", styles["Normal"])]
    if payload.pending:
        story += [
            Spacer(1, 14),
            Paragraph("Moldes sin fecha", styles["Heading3"]),
            Paragraph("No tienen paneles programados, por lo que aún no exigen una fecha de operatividad.",
                      styles["Normal"]),
            Spacer(1, 6),
            pdf_table(["Molde", "Tipo"], [[mold.name, mold.tipo or "—"] for mold in payload.pending],
                      [6 * cm, 4 * cm]),
        ]
    return story


# ---------- Análisis de cumplimiento ----------

ANALYSIS_HEAD = ["Semana de instalación", "Frente", "Paneles", "Antes", "En semana", "Después", "Sin fecha", "Riesgo"]
ANALYSIS_WIDTHS = [5.4 * cm, 4.4 * cm, 2.2 * cm, 2.2 * cm, 2.4 * cm, 2.4 * cm, 2.4 * cm, 2.4 * cm]
ISSUES_HEAD = ["Panel", "Frente / instalación", "Fabricación", "Diagnóstico"]
ISSUES_WIDTHS = [6.5 * cm, 7 * cm, 4 * cm, 7.3 * cm]


class Counts(BaseModel):
    advance: int = 0
    week: int = 0
    late: int = 0
    unscheduled: int = 0


class AnalysisGroup(BaseModel):
    week: str
    front: str
    color: str | None = None
    total: int = 0
    counts: Counts = Field(default_factory=Counts)


class AnalysisIssue(BaseModel):
    code: str
    mold: str = "—"
    front: str = "—"
    week: str | None = None
    date: str | None = None
    status: str = "late"
    delay: int = 0


class AnalysisPayload(BaseModel):
    totals: Counts = Field(default_factory=Counts)
    total: int = 0
    groups: list[AnalysisGroup] = Field(default_factory=list)
    issues: list[AnalysisIssue] = Field(default_factory=list)


def analysis_story(payload):
    styles = getSampleStyleSheet()
    totals = payload.totals
    story = [
        Paragraph("Análisis de cumplimiento", styles["Title"]),
        Paragraph("Comparación de las fechas previstas de fabricación con la semana asignada para instalación "
                  "de cada panel.", styles["Normal"]),
        Spacer(1, 8),
    ]
    if not payload.total:
        story.append(Paragraph("Aún no hay paneles asignados a instalación.", styles["Normal"]))
        return story
    story.append(Paragraph(
        f"Generado el {CalendarDate.today():%d/%m/%Y} &nbsp;·&nbsp; {payload.total} paneles en el plan &nbsp;·&nbsp; "
        f"{totals.advance} antes de la semana &nbsp;·&nbsp; {totals.week} en su semana &nbsp;·&nbsp; "
        f"{totals.late} después del sábado &nbsp;·&nbsp; {totals.unscheduled} sin fecha de fabricación",
        styles["Normal"]))
    story.append(Spacer(1, 8))
    rows, style = [], []
    for index, group in enumerate(payload.groups, 1):
        counts = group.counts
        rows.append([week_span(group.week), group.front, group.total, counts.advance, counts.week,
                     counts.late, counts.unscheduled, counts.late + counts.unscheduled or "—"])
        style.append(("LINEBEFORE", (1, index), (1, index), 3, swatch(group.color)))
    table = pdf_table(ANALYSIS_HEAD, rows, ANALYSIS_WIDTHS)
    table.setStyle(TableStyle(style))
    story.append(table)
    if payload.issues:
        story += [
            Spacer(1, 16),
            Paragraph("Paneles que requieren atención", styles["Heading2"]),
            Paragraph("Prioridad por semana de instalación; los retrasos se miden desde el sábado de esa semana.",
                      styles["Normal"]),
            Spacer(1, 6),
            pdf_table(ISSUES_HEAD, [
                [item.code, f"{item.front} · {week_span(item.week)}", fmt(item.date),
                 "Sin fecha" if item.status == "unscheduled" else f"{item.delay} {'día' if item.delay == 1 else 'días'} después del sábado"]
                for item in payload.issues
            ], ISSUES_WIDTHS),
        ]
    return story


def create_report_exports_router():
    router = APIRouter(prefix="/reports", tags=["Reportes"])

    def pdf_response(story, title, filename, pagesize):
        output = BytesIO()
        SimpleDocTemplate(output, pagesize=pagesize, leftMargin=1.2 * cm, rightMargin=1.2 * cm,
                          topMargin=1.2 * cm, bottomMargin=1.2 * cm, title=title).build(story)
        return Response(output.getvalue(), media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="{filename}"',
                                 "Cache-Control": "no-store"})

    @router.post("/mold-readiness.pdf")
    async def export_mold_readiness(payload: ReadinessPayload):
        return pdf_response(readiness_story(payload), "Plazos de moldes",
                            f"plazos_moldes_{CalendarDate.today().isoformat()}.pdf", A4)

    @router.post("/analysis.pdf")
    async def export_analysis(payload: AnalysisPayload):
        return pdf_response(analysis_story(payload), "Análisis de cumplimiento",
                            f"analisis_cumplimiento_{CalendarDate.today().isoformat()}.pdf", landscape(A4))

    return router

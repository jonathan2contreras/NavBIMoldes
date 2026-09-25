"""Hoja horizontal de hitos, ajustada completa sin recortar ni dividir el gráfico."""
from collections import defaultdict
from datetime import date
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, NextPageTemplate, PageBreak,
    PageTemplate, Paragraph, Spacer,
)


def date_label(value):
    return date.fromisoformat(value).strftime("%d/%m/%Y")


class ProductionTimeline(Flowable):
    """Escala vectorial uniforme para conservar todos los hitos en una hoja."""

    def __init__(self, rows, start, finish, width, max_height):
        super().__init__()
        groups = defaultdict(list)
        for row in rows:
            groups[row.first].append(row)
        self.dates = sorted(set(groups) | {start, finish})
        self.column_width = max(120, width / len(self.dates))
        self.columns = []
        text_style = ParagraphStyle("timeline", fontName="Helvetica", fontSize=9, leading=12)
        for day in self.dates:
            entries = []
            boundaries = []
            if day == start:
                boundaries.append("Inicio del cronograma")
            if day == finish:
                boundaries.append("Fin de producción")
            if boundaries:
                entries.append(("<b>" + " · ".join(boundaries) + "</b>", None))
            if groups[day]:
                entries.append(("Inicio de producción", None))
            for row in groups[day]:
                try:
                    color = colors.HexColor(row.color or "#8E8E93")
                except (ValueError, TypeError):
                    color = colors.HexColor("#8E8E93")
                copies = f" · {row.copies} copias" if row.copies > 1 else ""
                entries.append((escape(row.name) + copies, color))
            column = []
            for text, color in entries:
                paragraph = Paragraph(text, text_style)
                _, height = paragraph.wrap(self.column_width - 28, 100000)
                column.append((paragraph, height + 12, color))
            self.columns.append(column)
        natural_width = self.column_width * len(self.dates)
        self.natural_height = 50 + max(sum(item[1] + 6 for item in column) for column in self.columns)
        self.scale = min(1, width / natural_width, max_height / self.natural_height)
        self.width = natural_width * self.scale
        self.height = self.natural_height * self.scale

    def draw(self):
        canvas = self.canv
        canvas.saveState()
        canvas.scale(self.scale, self.scale)
        axis_y = self.natural_height - 30
        canvas.setStrokeColor(colors.HexColor("#D1D1D6"))
        canvas.setLineWidth(1.5)
        canvas.line(6, axis_y, (len(self.dates) - 1) * self.column_width + 6, axis_y)
        for index, (day, column) in enumerate(zip(self.dates, self.columns)):
            x = index * self.column_width + 6
            canvas.setFillColor(colors.HexColor("#3A3A3C"))
            canvas.setFont("Helvetica-Bold", 10)
            canvas.drawString(x, axis_y + 16, date_label(day))
            canvas.setFillColor(colors.HexColor("#111111" if index in (0, len(self.dates) - 1) else "#007AFF"))
            canvas.circle(x, axis_y, 4, stroke=0, fill=1)
            top = axis_y - 16
            for paragraph, height, color in column:
                bottom = top - height
                if color is not None:
                    canvas.setFillColor(colors.HexColor("#F2F2F7"))
                    canvas.roundRect(x, bottom, self.column_width - 18, height, 4, stroke=0, fill=1)
                    canvas.setStrokeColor(color)
                    canvas.setLineWidth(3)
                    canvas.line(x + 2, bottom + 4, x + 2, top - 4)
                paragraph.drawOn(canvas, x + 6, bottom + 6)
                top = bottom - 6
        canvas.restoreState()


def build_readiness_pdf(story, payload):
    """Conserva el informe vertical y añade una única página A4 horizontal."""
    output = BytesIO()
    margin = 1.2 * cm
    document = BaseDocTemplate(output, pagesize=A4, title="Plazos de moldes")
    for name, size in (("report", A4), ("timeline", landscape(A4))):
        frame = Frame(margin, margin, size[0] - 2 * margin, size[1] - 2 * margin)
        document.addPageTemplates(PageTemplate(id=name, frames=[frame], pagesize=size))
    if payload.rows:
        start = payload.start_date or min(row.first for row in payload.rows)
        finish = payload.finish_date or max(row.last for row in payload.rows)
        width, height = landscape(A4)
        styles = getSampleStyleSheet()
        story = story + [
            NextPageTemplate("timeline"), PageBreak(),
            Paragraph("Plazos de moldes · Línea de tiempo de producción", styles["Title"]),
            Paragraph(f"Inicio del cronograma: {date_label(start)} &nbsp;·&nbsp; "
                      f"Fin de producción: {date_label(finish)}", styles["Normal"]),
            Spacer(1, 18),
            ProductionTimeline(payload.rows, start, finish, width - 2 * margin - 12,
                               height - 2 * margin - 130),
            Spacer(1, 12),
            Paragraph("Cada punto reúne los moldes que inician producción en esa fecha. "
                      "Hitos ordenados por fecha; la separación entre puntos no representa la duración.",
                      styles["Normal"]),
        ]
    document.build(story)
    return output.getvalue()

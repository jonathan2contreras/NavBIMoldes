import React, { useState } from "react";
import { FileSpreadsheet, FileText, GanttChart, Layers, StretchHorizontal } from "lucide-react";
import { BACKEND_URL } from "../../lib/api";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";

const FORMATS = {
  xlsx: {
    label: "Excel", Icon: FileSpreadsheet, path: "export.xlsx",
    sheets: "Una hoja para el resumen, otra para el cronograma y otra para el plan de instalación.",
    continuous: "Todo en una sola hoja, con cada sección debajo de la anterior.",
  },
  pdf: {
    label: "PDF", Icon: FileText, path: "export.pdf",
    sheets: "Una página por sección y más páginas A4 cuando hay muchas filas.",
    continuous: "Todo seguido en una sola página larga, sin saltos de página.",
  },
  gantt: {
    label: "Gantt PDF", Icon: GanttChart, path: "export-gantt.pdf",
    sheets: "Una hoja por cada 14 días, cómoda para imprimir.",
    continuous: "Todos los días en una sola hoja ancha.",
  },
};

export const exportUrl = (kind, layout) => `${BACKEND_URL}/api/schedule/${FORMATS[kind].path}?layout=${layout}`;

/** Exports the saved schedule (Excel / PDF / Gantt PDF), asking first whether to use several sheets or one continuous sheet. */
export const ScheduleExport = () => {
  const [kind, setKind] = useState(null);
  const format = kind ? FORMATS[kind] : null;
  const download = (layout) => {
    const link = document.createElement("a");
    link.href = exportUrl(kind, layout);
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setKind(null);
  };
  return <div className="flex items-center gap-2" data-testid="schedule-export">
    {Object.entries(FORMATS).map(([key, { label, Icon }]) => (
      <Button key={key} type="button" variant="outline" size="sm" onClick={() => setKind(key)} data-testid={`schedule-export-${key}`}><Icon /> {label}</Button>
    ))}
    <Dialog open={!!kind} onOpenChange={(open) => { if (!open) setKind(null); }}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-md rounded-lg" data-testid="schedule-export-dialog">
        <DialogTitle className="pr-5 tracking-normal">¿Cómo quieres exportar el {format?.label}?</DialogTitle>
        <DialogDescription>Elige cómo se reparte el cronograma en el archivo.</DialogDescription>
        <div className="grid gap-2">
          <button type="button" onClick={() => download("sheets")} data-testid="schedule-export-sheets"
            className="flex items-start gap-3 rounded-lg border border-[#C7C7CC] p-3 text-left transition-colors hover:border-[#1C1C1E] hover:bg-[#F2F2F7]">
            <Layers className="mt-0.5 shrink-0" size={20} />
            <span><strong className="block text-sm">Varias hojas</strong><span className="text-xs text-[#636366]">{format?.sheets}</span></span>
          </button>
          <button type="button" onClick={() => download("continuous")} data-testid="schedule-export-continuous"
            className="flex items-start gap-3 rounded-lg border border-[#C7C7CC] p-3 text-left transition-colors hover:border-[#1C1C1E] hover:bg-[#F2F2F7]">
            <StretchHorizontal className="mt-0.5 shrink-0" size={20} />
            <span><strong className="block text-sm">Hoja continua</strong><span className="text-xs text-[#636366]">{format?.continuous}</span></span>
          </button>
        </div>
        <div className="flex justify-end"><Button type="button" variant="outline" onClick={() => setKind(null)} data-testid="schedule-export-cancel">Cancelar</Button></div>
      </DialogContent>
    </Dialog>
  </div>;
};

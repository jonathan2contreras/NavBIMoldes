import React, { useState } from "react";
import { FileSpreadsheet, FileText, GanttChart } from "lucide-react";
import { BACKEND_URL } from "../../lib/api";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";

const GANTT_LAYOUTS = [
  { value: "single", label: "Una sola hoja", hint: "Todo el cronograma en una hoja ancha" },
  { value: "pages", label: "Varias hojas", hint: "Una hoja por cada bloque de 14 días" },
];

/** Downloads the saved schedule + installation plan as Excel or PDF, and the Gantt chart as PDF. */
export const ScheduleExport = () => {
  const [askGantt, setAskGantt] = useState(false);
  return <div className="flex items-center gap-2" data-testid="schedule-export">
    <Button asChild variant="outline" size="sm">
      <a href={`${BACKEND_URL}/api/schedule/export.xlsx`} download data-testid="schedule-export-xlsx"><FileSpreadsheet /> Excel</a>
    </Button>
    <Button asChild variant="outline" size="sm">
      <a href={`${BACKEND_URL}/api/schedule/export.pdf`} download data-testid="schedule-export-pdf"><FileText /> PDF</a>
    </Button>
    <Button variant="outline" size="sm" data-testid="schedule-export-gantt" onClick={() => setAskGantt(true)}><GanttChart /> Gantt PDF</Button>
    <Dialog open={askGantt} onOpenChange={setAskGantt}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-md rounded-lg" data-testid="gantt-export-dialog">
        <DialogTitle>Exportar Gantt por molde</DialogTitle>
        <DialogDescription>¿Quieres el diagrama en una sola hoja o repartido en varias?</DialogDescription>
        <div className="grid gap-2">
          {GANTT_LAYOUTS.map(({ value, label, hint }) => <Button key={value} asChild variant="outline" className="h-auto justify-start py-2">
            <a href={`${BACKEND_URL}/api/schedule/export-gantt.pdf?layout=${value}`} download data-testid={`gantt-export-${value}`} onClick={() => setAskGantt(false)}>
              <span className="text-left"><span className="block font-semibold">{label}</span><span className="block text-xs font-normal text-[#636366]">{hint}</span></span>
            </a>
          </Button>)}
        </div>
      </DialogContent>
    </Dialog>
  </div>;
};

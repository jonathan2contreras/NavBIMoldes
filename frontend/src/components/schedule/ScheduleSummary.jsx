import React from "react";
import { CalendarCheck, CircleDashed, Layers, ListChecks } from "lucide-react";
import { dateLabel } from "./dates";

export const ScheduleSummary = ({ data }) => {
  const metrics = [
    { key: "scheduled", label: "Paneles programados", value: data.scheduled.toLocaleString("es-ES"), note: `De ${data.total_project.toLocaleString("es-ES")} paneles del proyecto`, Icon: ListChecks, color: "#18824B" },
    { key: "unscheduled", label: "Sin programar", value: data.unscheduled.toLocaleString("es-ES"), note: "Con molde asignado", Icon: CircleDashed, color: "#AE6500" },
    { key: "awaiting-mold", label: "Pendientes de molde", value: data.awaiting_mold.toLocaleString("es-ES"), note: "Fuera de la planificación", Icon: Layers, color: "#636366" },
    { key: "finish", label: "Fin previsto", value: dateLabel(data.finish_date), note: `${data.working_day_span} jornadas · producción prevista`, Icon: CalendarCheck, color: "#007AFF" },
  ];
  return <div className="grid grid-cols-2 gap-x-5 gap-y-6 py-6 lg:grid-cols-4" data-testid="schedule-summary">
    {metrics.map(({ key, label, value, note, Icon, color }) => <div key={key} className="min-w-0 border-l-2 pl-3" style={{ borderColor: color }}>
      <div className="flex min-h-8 items-start gap-1.5 text-xs font-semibold text-[#636366]"><Icon size={14} className="shrink-0" /><span>{label}</span></div>
      <p className={`${key === "finish" ? "text-base sm:text-xl" : "text-2xl sm:text-3xl"} mt-1 break-words font-extrabold tabular-nums`} data-testid={`schedule-kpi-${key}`}>{value}</p>
      <p className="mt-2 text-xs text-[#636366]" data-testid={`schedule-kpi-${key}-context`}>{note}</p>
    </div>)}
  </div>;
};
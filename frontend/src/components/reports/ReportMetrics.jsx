import React from "react";
import { Box, CheckCircle2, CircleDashed, Layers, Pencil } from "lucide-react";
import { useRole } from "../../context/RoleContext";
import { useProjectPanels } from "../../context/ProjectPanelsContext";
import { number, percent } from "./reportData";

export const ReportMetrics = ({ data, rows }) => {
  const { isAdmin } = useRole();
  const { setEditorOpen } = useProjectPanels();
  const projectScope = data.scope === "project";
  const used = rows.filter((row) => row.count > 0).length;
  const metrics = [
    { key: "total", label: projectScope ? "Total de paneles" : "Paneles filtrados", value: data.total,
      note: projectScope ? (data.project.is_manual ? "Total manual del proyecto" : "Total según modelo") : "Piezas reales del modelo", Icon: Box, color: "#3A3A3C" },
    { key: "assigned", label: "Paneles asignados", value: data.con_molde, note: `${percent(data.con_molde, data.total)} % del total`, Icon: CheckCircle2, color: "#18824B" },
    { key: "unassigned", label: "Paneles sin asignar", value: data.sin_molde, note: `${percent(data.sin_molde, data.total)} % del total`, Icon: CircleDashed, color: "#AE6500" },
    { key: "used-molds", label: "Moldes utilizados", value: used, note: `${number(rows.length)} moldes en la selección`, Icon: Layers, color: "#007AFF" },
  ];
  return (
    <section data-testid="report-summary" aria-label="Resumen de paneles" className="grid grid-cols-2 gap-x-5 gap-y-6 py-7 md:grid-cols-4 md:gap-x-8">
      {metrics.map(({ key, label, value, note, Icon, color }) => <div key={key} className="min-w-0 border-l-2 pl-3 sm:pl-4" style={{ borderColor: color }} data-testid={`report-metric-${key}`}>
        <div className="flex min-h-9 items-start gap-1.5 text-xs font-semibold text-[#636366]"><Icon size={14} className="mt-px shrink-0" style={{ color }} /><span>{label}</span>
          {key === "total" && projectScope && isAdmin && <button className="shrink-0 rounded p-0.5 transition-colors hover:bg-[#F2F2F7]" data-testid="report-edit-project-total" aria-label="Editar total del proyecto" title="Editar total del proyecto" onClick={() => setEditorOpen(true)}><Pencil size={13} /></button>}
        </div>
        <p className={`mt-1 font-extrabold tabular-nums ${value > 999999 ? "text-base sm:text-2xl" : value > 9999 ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"}`} data-testid={`report-kpi-${key}`}>{number(value)}</p>
        <p className="mt-2 text-xs text-[#636366]" data-testid={`report-kpi-${key}-context`}>{note}</p>
      </div>)}
    </section>
  );
};
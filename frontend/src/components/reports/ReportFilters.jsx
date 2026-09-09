import React from "react";
import { Compass, Layers, Shapes, X } from "lucide-react";
import { Chip } from "../Chip";
import { Button } from "../ui/button";
import { FACADE_FILTERS } from "../../lib/theme";

export const ReportFilters = ({ filters, setFilters, molds, tipos }) => {
  const change = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const active = Object.values(filters).some((value) => value !== "all");
  return (
    <section className="border-y border-[#E5E5EA] py-4" aria-label="Filtros del reporte" data-testid="report-filters">
      <div className="flex flex-wrap gap-2 pb-4">
        {FACADE_FILTERS.map((f) => <Chip key={f.key} testId={`report-facade-${f.key}`} selected={filters.facade === f.key}
          color="#007AFF" icon={f.key !== "all" ? <Compass size={13} /> : null} label={f.label} onClick={() => change("facade", f.key)} />)}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5 text-xs font-semibold text-[#636366]" htmlFor="report-molde">
          <span className="flex items-center gap-1.5"><Layers size={13} /> Molde</span>
          <select id="report-molde" data-testid="report-filter-molde" value={filters.molde} onChange={(e) => change("molde", e.target.value)} className="report-select">
            <option value="all">Todos los moldes</option><option value="__none__">Sin molde</option>
            {molds.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5 text-xs font-semibold text-[#636366]" htmlFor="report-tipo">
          <span className="flex items-center gap-1.5"><Shapes size={13} /> Tipo</span>
          <select id="report-tipo" data-testid="report-filter-tipo" value={filters.tipo} onChange={(e) => change("tipo", e.target.value)} className="report-select">
            <option value="all">Todos los tipos</option><option value="__none__">Sin tipo</option>
            {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        {active && <Button variant="ghost" className="h-11 text-[#636366]" data-testid="report-clear-filters" onClick={() => setFilters({ facade: "all", molde: "all", tipo: "all" })}><X /> Limpiar filtros</Button>}
      </div>
    </section>
  );
};
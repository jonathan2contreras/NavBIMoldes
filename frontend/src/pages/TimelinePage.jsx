import React, { useMemo } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { useSchedule } from "../components/schedule/useSchedule";
import { areaLabel, dateLabel } from "../components/schedule/dates";

export default function TimelinePage() {
  const { data, loading, error, refresh } = useSchedule();

  const rows = useMemo(() => {
    if (!data) return [];
    const totals = new Map(data.molds.map((m) => [m.name, m.total]));
    const byMold = new Map();
    data.panels.forEach((p) => {
      if (!p.date) return;
      const row = byMold.get(p.molde) || { molde: p.molde, tipo: p.tipo, color: p.color, first: p.date, last: p.date, days: new Set(), panels: 0, area: 0 };
      if (p.date < row.first) row.first = p.date;
      if (p.date > row.last) row.last = p.date;
      row.days.add(p.date);
      row.panels += 1;
      row.area += p.area || 0;
      byMold.set(p.molde, row);
    });
    return [...byMold.values()]
      .map((r) => ({ ...r, total: totals.get(r.molde) ?? r.panels, dayCount: r.days.size }))
      .sort((a, b) => a.first.localeCompare(b.first) || a.molde.localeCompare(b.molde, "es", { numeric: true }));
  }, [data]);

  const totalArea = rows.reduce((sum, r) => sum + r.area, 0);
  const totalPanels = rows.reduce((sum, r) => sum + r.panels, 0);

  return <div className="h-full overflow-y-auto bg-white text-[#111111]" data-testid="timeline-screen">
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-6 sm:px-7 sm:pt-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl" data-testid="timeline-title">Línea de tiempo</h1>
          <p className="mt-2 text-sm text-[#636366]">Moldes a fabricar y sus fechas según el cronograma de fabricación</p>
        </div>
        <Button variant="outline" size="icon" disabled={loading} onClick={refresh} title="Actualizar" aria-label="Actualizar" data-testid="timeline-refresh"><RefreshCw className={loading ? "animate-spin" : ""} /></Button>
      </header>

      {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800" data-testid="timeline-error"><p>{error}</p><Button variant="outline" disabled={loading} onClick={refresh} data-testid="timeline-retry">Actualizar</Button></div>}

      {!data && loading && <div role="status" className="flex justify-center py-20" data-testid="timeline-loading"><Loader2 className="animate-spin" aria-label="Cargando línea de tiempo" /></div>}

      {data && <div className="flex flex-wrap gap-6 rounded-lg bg-[#F2F2F7] px-4 py-3 text-sm" data-testid="timeline-summary">
        <span><span className="font-bold">{rows.length}</span> moldes programados</span>
        <span><span className="font-bold">{totalPanels}</span> paneles</span>
        <span><span className="font-bold">{areaLabel(totalArea)}</span></span>
        <span>Del <span className="font-bold">{dateLabel(data.start_date)}</span> al <span className="font-bold">{dateLabel(data.finish_date)}</span></span>
      </div>}

      {data && (rows.length ? <div className="mt-5 overflow-x-auto rounded-lg border border-[#E5E5EA]">
        <table className="w-full min-w-[720px] border-collapse text-sm" data-testid="timeline-table">
          <thead>
            <tr className="bg-[#1C1C1E] text-left text-xs uppercase tracking-wide text-white">
              <th className="px-4 py-3 font-bold">Molde</th>
              <th className="px-4 py-3 font-bold">Tipo</th>
              <th className="px-4 py-3 font-bold">Inicio</th>
              <th className="px-4 py-3 font-bold">Fin</th>
              <th className="px-4 py-3 font-bold">Días</th>
              <th className="px-4 py-3 font-bold">Paneles</th>
              <th className="px-4 py-3 font-bold">m²</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => <tr key={r.molde} className="border-t border-[#E5E5EA] even:bg-[#F9F9FB]" data-testid={`timeline-row-${encodeURIComponent(r.molde)}`}>
              <td className="px-4 py-3">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: r.color }} />
                  <span className="font-bold">{r.molde}</span>
                </span>
              </td>
              <td className="px-4 py-3 text-[#636366]">{r.tipo || "—"}</td>
              <td className="px-4 py-3">{dateLabel(r.first)}</td>
              <td className="px-4 py-3">{dateLabel(r.last)}</td>
              <td className="px-4 py-3">{r.dayCount}</td>
              <td className="px-4 py-3">{r.panels} / {r.total}</td>
              <td className="px-4 py-3 text-[#007AFF]">{areaLabel(r.area)}</td>
            </tr>)}
          </tbody>
        </table>
      </div> : <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900" data-testid="timeline-empty">Aún no hay moldes programados. Genera o guarda el cronograma en la pestaña Fabricación para ver la línea de tiempo.</p>)}
    </div>
  </div>;
}

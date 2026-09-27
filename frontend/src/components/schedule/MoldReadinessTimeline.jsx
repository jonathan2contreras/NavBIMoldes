import React from "react";
import { dateLabel } from "./dates";
import { dayDiff } from "./moldReadiness";

// Diagrama de tiempo: por cada molde, el rango de días en que se fabrican sus paneles.
// La fecha límite de operatividad es el primer día de fabricación de ese molde.
export const MoldReadinessTimeline = ({ readiness }) => {
  const { rows, pending, start, total, ticks, today } = readiness;

  if (!rows.length) {
    return <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900" data-testid="mold-readiness-empty">Aún no hay moldes programados. Genera o guarda el cronograma en la pestaña Fabricación para ver los plazos de moldes.</p>;
  }

  const pct = (date) => (dayDiff(date, start) / total) * 100;

  return <section className="min-w-0" data-testid="mold-readiness">
    <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#636366]">
      <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-[#FF3B30]" />Fecha límite de operatividad (primer panel del molde)</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded-full bg-[#8E8E93] opacity-40" />Días en que se fabrica con ese molde</span>
      {today && <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 border-l-2 border-dashed border-[#007AFF]" />Hoy</span>}
    </div>
    <div className="overflow-x-auto rounded-lg border border-[#E5E5EA]" data-testid="mold-readiness-scroll">
      <div style={{ minWidth: 210 + Math.max(total * 14, 480) }}>
        <div className="flex border-b border-[#C7C7CC] bg-[#F2F2F7] text-[10px] font-semibold capitalize text-[#636366]">
          <div className="sticky left-0 z-10 w-[210px] shrink-0 border-r border-[#C7C7CC] bg-[#F2F2F7] px-3 py-2 text-xs font-bold text-[#111111]">Molde</div>
          <div className="relative h-9 flex-1">
            {ticks.map((t) => <span key={t.date} className={`absolute top-2.5 whitespace-nowrap ${t.left === 0 ? "" : "-translate-x-1/2"}`} style={{ left: `${t.left}%` }}>{dateLabel(t.date, "d MMM")}</span>)}
          </div>
        </div>
        {rows.map((r) => {
          const color = r.mold?.color || "#8E8E93";
          const left = pct(r.first);
          const width = Math.max(pct(r.last) - left, 0.7);
          return <div key={r.name} className="flex border-b border-[#E5E5EA] last:border-b-0" data-testid={`mold-readiness-row-${encodeURIComponent(r.name)}`}>
            <div className="sticky left-0 z-10 flex w-[210px] shrink-0 flex-col justify-center gap-0.5 border-r border-[#E5E5EA] bg-white px-3 py-2">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                <span className="truncate text-xs font-bold">{r.name}</span>
                {(r.mold?.copies || 1) > 1 && <span className="shrink-0 rounded bg-[#E8E8ED] px-1.5 py-0.5 text-[10px] font-semibold text-[#3A3A3C]" data-testid="mold-readiness-copies">{r.mold.copies} copias</span>}
              </span>
              <span className="text-[11px] font-semibold text-[#FF3B30]" data-testid={`mold-readiness-deadline-${encodeURIComponent(r.name)}`}>Listo antes del {dateLabel(r.first)}</span>
              <span className="text-[10px] text-[#636366]">{r.mold?.tipo || "Sin tipo"} · {r.panels}/{r.mold?.total ?? r.panels} paneles · {r.dayCount} {r.dayCount === 1 ? "día" : "días"}</span>
            </div>
            <div className="relative h-16 flex-1">
              {ticks.map((t) => <span key={t.date} className="absolute inset-y-0 border-l border-[#F2F2F7]" style={{ left: `${t.left}%` }} />)}
              {today && <span className="absolute inset-y-0 border-l-2 border-dashed border-[#007AFF]" style={{ left: `${pct(today)}%` }} />}
              <div className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full opacity-40" style={{ left: `${left}%`, width: `${width}%`, backgroundColor: color }} title={`${dateLabel(r.first)} – ${dateLabel(r.last)}`} />
              <span className="absolute top-1/2 h-6 -translate-y-1/2 border-l-2 border-[#FF3B30]" style={{ left: `${left}%` }} title={`Operativo el ${dateLabel(r.first)}`} />
            </div>
          </div>;
        })}
      </div>
    </div>
    {pending.length > 0 && <div className="mt-5" data-testid="mold-readiness-pending">
      <h2 className="text-sm font-bold">Moldes sin fecha</h2>
      <p className="mt-1 text-xs text-[#636366]">No tienen paneles programados, por lo que aún no exigen una fecha de operatividad.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {pending.map((m) => <span key={m.name} className="flex items-center gap-1.5 rounded-full border border-[#E5E5EA] px-2.5 py-1 text-xs font-semibold text-[#3A3A3C]">
          <span className="h-2 w-2 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: m.color || "#8E8E93" }} />{m.name}
        </span>)}
      </div>
    </div>}
  </section>;
};

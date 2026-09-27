import React from "react";
import { dateLabel, shiftDay } from "./dates";

// Hitos cronológicos: los moldes que comienzan el mismo día comparten un punto.
// La separación entre hitos es uniforme, no representa la duración entre fechas.
export default function MoldProductionTimeline({ readiness }) {
  const { rows, start, total } = readiness;
  if (!rows.length) return null;

  const end = shiftDay(start, total - 1);
  const byDate = new Map();
  rows.forEach((row) => {
    if (!byDate.has(row.first)) byDate.set(row.first, []);
    byDate.get(row.first).push(row);
  });
  const dates = [...new Set([start, ...byDate.keys(), end])].sort();

  return <section className="mb-7 rounded-xl border border-[#E5E5EA] bg-white p-4 sm:p-5" aria-labelledby="production-timeline-title" data-testid="mold-production-timeline">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="production-timeline-title" className="text-base font-bold">Línea de tiempo de producción</h2>
        <p className="mt-1 text-xs text-[#636366]">Cada punto reúne los moldes que inician producción en esa fecha.</p>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-lg bg-[#F2F2F7] px-3 py-2 text-xs">
        <div><span className="block text-[#636366]">Inicio del cronograma</span><time dateTime={start} className="font-bold">{dateLabel(start)}</time></div>
        <div><span className="block text-[#636366]">Fin de producción</span><time dateTime={end} className="font-bold">{dateLabel(end)}</time></div>
      </div>
    </div>
    <div className="overflow-x-auto pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]" tabIndex={0} role="region" aria-label="Línea de tiempo horizontal, desplazable" data-testid="mold-production-scroll">
    <ol className="flex w-max min-w-full px-1 pt-1" aria-label="Fechas de inicio de producción por molde">
      {dates.map((date, index) => {
        const molds = byDate.get(date) || [];
        // Cada copia fabrica por su cuenta, así que suma como un molde más.
        const units = molds.reduce((sum, row) => sum + (row.mold?.copies || 1), 0);
        const isStart = date === start;
        const isEnd = date === end;
        return <li key={date} className="w-44 min-w-0 flex-1" data-testid="mold-production-milestone" data-date={date}>
          <time dateTime={date} className="block pr-4 text-xs font-semibold capitalize text-[#3A3A3C]">{dateLabel(date)}</time>
          <div className="relative my-3 flex h-3 items-center" aria-hidden="true">
            {index < dates.length - 1 && <span className="absolute left-1.5 right-0 h-0.5 bg-[#D1D1D6]" />}
            <span className={`relative h-3 w-3 shrink-0 rounded-full border-2 ${isStart || isEnd ? "border-[#111111] bg-[#111111]" : "border-[#007AFF] bg-white"}`} />
          </div>
          <div className="min-w-0 pr-5 pb-1">
            {(isStart || isEnd) && <p className="mb-1 text-xs font-bold">{[isStart && "Inicio del cronograma", isEnd && "Fin de producción"].filter(Boolean).join(" · ")}</p>}
            {molds.length > 0 && <>
              <p className="mb-2 text-[11px] text-[#636366]" data-testid="mold-production-count">Inicio de producción<br />{units} {units === 1 ? "molde" : "moldes"}</p>
              <ul className="flex flex-wrap gap-2">
                {molds.map((row) => <li key={row.name} className="flex min-w-0 items-center gap-2 rounded-md border border-[#E5E5EA] bg-[#FAFAFC] px-2.5 py-1.5 text-xs font-bold" data-testid="mold-production-mold" data-mold={row.name} data-start={row.first}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: row.mold?.color || "#8E8E93" }} aria-hidden="true" />
                  <span className="break-words">{row.name}</span>
                  {(row.mold?.copies || 1) > 1 && <span className="rounded bg-[#E8E8ED] px-1.5 py-0.5 text-[10px] font-semibold text-[#3A3A3C]" data-testid="mold-production-copies">{row.mold.copies} copias</span>}
                </li>)}
              </ul>
            </>}
          </div>
        </li>;
      })}
    </ol>
    </div>
    <p className="mt-4 border-t border-[#E5E5EA] pt-3 text-[11px] text-[#636366]">Desplázate horizontalmente para ver todas las fechas. Hitos ordenados por fecha; la separación entre puntos no representa la duración. La vista Cronograma muestra los períodos de fabricación a escala.</p>
  </section>;
}

import React, { useEffect, useMemo, useState } from "react";
import { addWeeks, format, parseISO } from "date-fns";
import { groupPhases, weekColor, weekLabel, weekMonday, weekShort } from "../../lib/phases";

const shift = (week, count) => format(addWeeks(parseISO(week), count), "yyyy-MM-dd");
const same = (a, b) => a?.front_id === b?.front_id && a?.week === b?.week;

export default function InstallationGantt({ plan, admin, selection, onSelect, onMove, busy }) {
  const [date, setDate] = useState("");
  const [padding, setPadding] = useState(2);
  const [dragged, setDragged] = useState(null);
  const fronts = useMemo(() => groupPhases(plan), [plan]);
  const weeks = useMemo(() => {
    const dates = [...new Set(plan.items.map((i) => i.week))].sort();
    if (!dates.length) return [];
    const end = shift(dates[dates.length - 1], padding);
    const result = [];
    for (let day = shift(dates[0], -padding); day <= end; day = shift(day, 1)) result.push(day);
    return result;
  }, [plan, padding]);
  useEffect(() => { setDate(selection?.week || ""); }, [selection]);
  const selectedFront = fronts.find((f) => f.id === selection?.front_id);
  const selectedWeek = selectedFront?.weeks.find((w) => w.week === selection?.week);

  if (!plan.items.length) return <div className="rounded-xl bg-white p-6 text-sm">El plan está vacío. Asigna paneles a frentes y semanas desde Modelo 3D → Selección múltiple → Asignar fase.</div>;

  return <div className="space-y-3" aria-busy={busy}>
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <p className="flex-1 text-[#636366]">{admin ? "Arrastra una etiqueta a otra semana del mismo frente o edita su fecha en el calendario." : "Solo un administrador puede cambiar las fechas."} Semanas de lunes a sábado.</p>
      <button className="rounded-lg border bg-white px-3 py-2" onClick={() => setPadding((p) => p + 4)}>Ampliar rango</button>
    </div>
    <div className="overflow-x-auto rounded-xl border border-[#D4D4D4] bg-white" data-testid="installation-gantt">
      <div style={{ minWidth: 150 + weeks.length * 116 }}>
        <div className="flex border-b bg-[#E5E5EA] text-xs font-semibold">
          <div className="sticky left-0 z-10 w-[150px] shrink-0 bg-[#E5E5EA] p-3">Frente / semana</div>
          {weeks.map((week) => <div key={week} className="w-[116px] shrink-0 border-l p-3" title={weekLabel(week)}>{weekShort(week)} {week.slice(0, 4)}</div>)}
        </div>
        {fronts.map((front) => <div key={front.id} className="flex border-b last:border-0">
          <div className="sticky left-0 z-10 flex w-[150px] shrink-0 items-center gap-2 bg-white p-3 text-sm font-bold"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: front.color }} />{front.name}</div>
          {weeks.map((week) => {
            const group = front.weeks.find((w) => w.week === week);
            const source = { front_id: front.id, week };
            const active = same(selection, source);
            return <div key={week} data-testid={`installation-cell-${front.id}-${week}`} className={`flex min-h-[70px] w-[116px] shrink-0 items-center border-l p-1 ${dragged?.front_id === front.id && !group ? "bg-blue-50" : ""}`}
              onDragOver={(e) => { if (admin && !busy && dragged?.front_id === front.id && !group) e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); if (admin && !busy && dragged?.front_id === front.id && !group) onMove(dragged, week); setDragged(null); }}>
              {group && <button type="button" draggable={admin && !busy} disabled={busy} aria-pressed={active}
                data-testid={`installation-week-${front.id}-${week}`}
                aria-label={`${front.name}, semana del ${weekLabel(week)}, ${group.items.length} paneles`}
                onDragStart={(e) => { setDragged(source); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", JSON.stringify(source)); }}
                onDragEnd={() => setDragged(null)} onClick={() => onSelect(active ? null : source)}
                className={`w-full rounded-lg border-2 px-1 py-2 text-xs font-bold text-[#111111] ${active ? "border-[#111111] ring-2 ring-[#007AFF]" : "border-transparent"} ${admin ? "cursor-grab active:cursor-grabbing" : ""}`}
                style={{ backgroundColor: weekColor(front, group.index) }}>
                Sem. {weekShort(week)}<span className="block text-[11px] font-medium">{group.items.length} paneles</span>
              </button>}
            </div>;
          })}
        </div>)}
      </div>
    </div>
    {selectedWeek ? <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3" data-testid="installation-selection">
      <div className="flex-1 text-sm"><strong>{selectedFront.name} · {weekLabel(selection.week)}</strong><p className="text-[#636366]">{selectedWeek.items.length} paneles para resaltar en el modelo.</p></div>
      {admin && <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); onMove(selection, date); }}>
        <label className="text-xs font-semibold">Fecha de la semana<input aria-label="Fecha de la semana" type="date" required value={date} disabled={busy} onChange={(e) => setDate(e.target.value)} className="mt-1 block rounded-lg border p-2 text-sm" /></label>
        <button type="submit" disabled={busy || !date || weekMonday(date) === selection.week} className="rounded-lg bg-[#1C1C1E] px-3 py-2 text-sm text-white disabled:opacity-40">{busy ? "Guardando…" : "Guardar fecha"}</button>
        <p className="w-full text-xs text-[#636366]">La fecha se ajusta al lunes de la semana elegida.</p>
      </form>}
      <button disabled={busy} onClick={() => onSelect(null)} className="rounded-lg border px-3 py-2 text-sm">Quitar resaltado</button>
    </div> : <p className="text-sm text-[#636366]">Selecciona una etiqueta de semana para ver sus paneles y editar sus fechas.</p>}
  </div>;
}

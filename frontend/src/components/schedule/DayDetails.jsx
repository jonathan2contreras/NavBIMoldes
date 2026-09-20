import React, { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { DayPanelItem } from "./DayPanelItem";
import { dateLabel, sunday } from "./dates";

export const DayDetails = ({ data, selected, onSelect, admin, busy, onMove }) => {
  const [query, setQuery] = useState("");
  const [choice, setChoice] = useState("");
  useEffect(() => { setChoice(""); }, [selected]);
  const panels = useMemo(() => data.panels.filter((p) => p.date === selected), [data.panels, selected]);
  const pending = useMemo(() => data.panels.filter((p) => !p.date && `${p.code} ${p.molde}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"))), [data.panels, query]);
  const rest = sunday(selected) || selected < data.start_date;
  const available = rest ? 0 : Math.max(0, data.daily_capacity - panels.length);
  const molds = new Set(panels.map((p) => p.molde));
  const add = async () => { if (choice && await onMove(choice, selected)) setChoice(""); };
  return <aside className="min-w-0 border-t border-[#E5E5EA] pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0" data-testid="schedule-day-detail">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold md:text-lg">Detalle diario</h2><span className="text-xs font-semibold text-[#007AFF]" data-testid="schedule-day-count">{panels.length} / {rest ? 0 : data.daily_capacity}</span></div>
    <label className="mt-3 block text-xs font-semibold text-[#636366]" htmlFor="schedule-selected-day">Día de fabricación<input id="schedule-selected-day" type="date" min={data.start_date} value={selected} onChange={(e) => { if (e.target.value) onSelect(e.target.value); }} className="schedule-input mt-1.5 w-full" data-testid="schedule-selected-day" /></label>
    <p className="mt-3 text-sm font-semibold capitalize" data-testid="schedule-day-heading">{dateLabel(selected, "EEEE d 'de' MMMM")}</p>
    <p className="mt-1 text-xs text-[#636366]" data-testid="schedule-day-availability">{rest ? "Día no laborable" : `${available} plazas disponibles`}</p>
    <div className="my-4 h-1 overflow-hidden rounded-full bg-[#E5E5EA]" aria-hidden="true"><div className="h-full bg-[#007AFF] transition-[width]" style={{ width: `${rest ? 0 : panels.length / data.daily_capacity * 100}%` }} /></div>
    <div className="space-y-2" data-testid="schedule-day-panels">
      {panels.map((p) => <DayPanelItem key={`${p.object_name}|${p.date}`} panel={p} admin={admin} busy={busy} start={data.start_date} onMove={onMove} />)}
      {!panels.length && <p className="py-6 text-sm text-[#8E8E93]" data-testid="schedule-day-empty">No hay paneles programados.</p>}
    </div>
    {admin && <section className="mt-5 space-y-2 border-t border-[#E5E5EA] pt-4" data-testid="schedule-add-panel">
      <h3 className="text-sm font-bold">Añadir panel pendiente</h3>
      <input className="schedule-input w-full" type="search" placeholder="Buscar código o molde" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar panel pendiente" data-testid="schedule-pending-search" />
      <select className="schedule-input w-full" value={choice} onChange={(e) => setChoice(e.target.value)} aria-label="Panel pendiente" data-testid="schedule-pending-select" disabled={busy || !available}>
        <option value="">{pending.length ? "Seleccionar panel" : "Sin paneles pendientes"}</option>
        {pending.map((p) => <option key={p.object_name} value={p.object_name} disabled={molds.has(p.molde)}>{p.code} · {p.molde}{molds.has(p.molde) ? " (molde ocupado)" : ""}</option>)}
      </select>
      <Button className="w-full" disabled={busy || !choice || !available || !pending.some((p) => p.object_name === choice && !molds.has(p.molde))} onClick={add} data-testid="schedule-add-button"><Plus /> Añadir a este día</Button>
    </section>}
  </aside>;
};
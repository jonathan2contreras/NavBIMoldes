import React, { useMemo, useState } from "react";
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from "lucide-react";
import { Button } from "../ui/button";
import { GanttCell } from "./GanttTask";
import { areaLabel, dateLabel, panelKey, shiftDay, sunday } from "./dates";

export const GanttTimeline = ({ data, selected, onSelect, admin, busy, onMove, rangeStart, setRangeStart }) => {
  const [length, setLength] = useState(14);
  const [drag, setDrag] = useState(null);
  const [dragError, setDragError] = useState("");
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }));
  const days = useMemo(() => Array.from({ length }, (_, i) => shiftDay(rangeStart, i)), [rangeStart, length]);
  const moldsInRouteOrder = useMemo(() => {
    const first = new Map();
    data.panels.forEach((panel) => { if (!first.has(panel.molde)) first.set(panel.molde, panel.sequence_index); });
    return [...data.molds].sort((a, b) => ((first.get(a.name) ?? Infinity) - (first.get(b.name) ?? Infinity)) || a.name.localeCompare(b.name, "es", { numeric: true }));
  }, [data.panels, data.molds]);
  const { cells, counts, areas } = useMemo(() => {
    const cells = new Map(), counts = {}, areas = {};
    data.panels.forEach((p) => { if (p.date) { cells.set(`${p.molde}|${p.date}`, p); counts[p.date] = (counts[p.date] || 0) + 1; areas[p.date] = (areas[p.date] || 0) + (p.area || 0); } });
    return { cells, counts, areas };
  }, [data.panels]);
  const endDrag = async ({ active, over }) => {
    setDrag(null);
    if (!over) return;
    const p = active.data.current.panel, target = over.data.current;
    if (target.molde !== p.molde) { setDragError("El panel debe permanecer en la fila de su molde."); return; }
    if (target.day === p.date) return;
    const result = await onMove(p.object_name, target.day);
    if (result) onSelect(target.day);
  };
  const end = data.finish_date ? shiftDay(data.finish_date, 1 - length) : data.start_date;
  return <section className="min-w-0" data-testid="schedule-gantt">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Ir al inicio" title="Ir al inicio" data-testid="gantt-first" onClick={() => setRangeStart(data.start_date)}><SkipBack /></Button>
        <Button variant="outline" size="icon" aria-label="Periodo anterior" title="Periodo anterior" data-testid="gantt-previous" disabled={rangeStart <= data.start_date} onClick={() => setRangeStart(shiftDay(rangeStart, -length) < data.start_date ? data.start_date : shiftDay(rangeStart, -length))}><ChevronLeft /></Button>
        <Button variant="outline" size="icon" aria-label="Periodo siguiente" title="Periodo siguiente" data-testid="gantt-next" onClick={() => setRangeStart(shiftDay(rangeStart, length))}><ChevronRight /></Button>
        <Button variant="ghost" size="icon" aria-label="Ir al final previsto" title="Ir al final previsto" data-testid="gantt-last" onClick={() => setRangeStart(end < data.start_date ? data.start_date : end)}><SkipForward /></Button>
      </div>
      <p className="text-xs font-semibold text-[#636366]" data-testid="gantt-range">{dateLabel(rangeStart, "d MMM")} – {dateLabel(days[days.length - 1])}</p>
      <select className="schedule-input !h-9 !text-xs" value={length} onChange={(e) => setLength(Number(e.target.value))} aria-label="Escala del cronograma" data-testid="gantt-scale"><option value={7}>7 días</option><option value={14}>14 días</option><option value={28}>28 días</option></select>
    </div>
    {dragError && <p role="alert" className="mb-3 text-sm text-red-700" data-testid="gantt-drag-error">{dragError}</p>}
    <DndContext sensors={sensors} onDragStart={({ active }) => { setDrag(active.data.current.panel); setDragError(""); }} onDragEnd={endDrag} onDragCancel={() => setDrag(null)}>
      <div className="gantt-scroll" data-testid="gantt-scroll" tabIndex={0} aria-label="Calendario de fabricación por molde">
        <div className="gantt-grid" style={{ gridTemplateColumns: `var(--gantt-label) repeat(${length}, minmax(68px, 1fr))`, minWidth: `calc(var(--gantt-label) + ${length * 68}px)` }}>
          <div className="gantt-label gantt-corner"><span className="font-bold">Molde</span><span className="mt-1 block text-[10px] text-[#636366]">Programados / total</span></div>
          {days.map((day) => <button key={day} data-testid={`gantt-day-${day}`} onClick={() => onSelect(day)} className={`gantt-day ${sunday(day) ? "gantt-rest" : ""} ${selected === day ? "gantt-selected" : ""}`} aria-pressed={selected === day}><span className="block text-[10px] capitalize text-[#636366]">{dateLabel(day, "EEE")}</span><span className="block text-base font-bold">{dateLabel(day, "d")}</span><span className="block text-[9px] text-[#636366]">{dateLabel(day, "MMM")}</span></button>)}
          {moldsInRouteOrder.map((mold) => <React.Fragment key={mold.name}>
            <div className="gantt-label" data-testid={`gantt-mold-${panelKey(mold.name)}`}><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: mold.color }} /><span className="break-words text-xs font-bold">{mold.name}</span></div><p className="mt-1 text-[10px] text-[#636366]" data-testid={`gantt-mold-count-${panelKey(mold.name)}`}>{mold.scheduled} / {mold.total} · {mold.tipo || "Sin tipo"}</p></div>
            {days.map((day) => <GanttCell key={day} mold={mold} day={day} panel={cells.get(`${mold.name}|${day}`)} selected={selected === day} admin={admin} busy={busy} start={data.start_date} onSelect={onSelect} />)}
          </React.Fragment>)}
          <div className="gantt-label border-t-2 text-xs font-bold">Paneles / día</div>
          {days.map((day) => <button key={day} data-testid={`gantt-day-count-${day}`} className={`gantt-total ${sunday(day) ? "gantt-rest" : ""}`} onClick={() => onSelect(day)}>{counts[day] || 0}<span className="font-normal text-[#8E8E93]"> / {sunday(day) ? 0 : data.daily_capacity}</span></button>)}
          <div className="gantt-label text-xs font-bold">m² / día</div>
          {days.map((day) => <div key={day} data-testid={`gantt-day-area-${day}`} className={`gantt-total flex items-center justify-center text-[#007AFF] ${sunday(day) ? "gantt-rest" : ""}`}>{areas[day] ? areaLabel(areas[day]) : "—"}</div>)}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>{drag && <div className="rounded border-2 bg-white px-3 py-2 text-xs font-bold shadow-lg" style={{ borderColor: drag.color }} data-testid="gantt-drag-preview">{drag.code}</div>}</DragOverlay>
    </DndContext>
    {!data.molds.length && <p className="py-8 text-sm text-[#636366]" data-testid="gantt-empty-catalog">No hay moldes en el catálogo.</p>}
  </section>;
};
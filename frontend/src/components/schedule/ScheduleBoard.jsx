import React, { useMemo, useState } from "react";
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { areaLabel, dateLabel, dayArea, panelKey, shiftDay, sunday } from "./dates";

const BoardCard = ({ panel, disabled, onSelect }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: panel.object_name, data: { panel }, disabled });
  return <div ref={setNodeRef} {...attributes} {...listeners} onClick={() => onSelect(panel.date)}
    className={`board-card ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`} style={{ borderLeftColor: panel.color, opacity: isDragging ? 0.3 : 1 }}
    data-testid={`board-card-${panelKey(panel.object_name)}`}>
    <div className="flex items-start justify-between gap-1"><span className="truncate text-xs font-bold">{panel.code.split(" [")[0]}</span><span className="shrink-0 text-[11px] font-bold text-[#007AFF]">{areaLabel(panel.area)}</span></div>
    <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-[#636366]"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: panel.color }} />{panel.molde} · {panel.tipo || "Sin tipo"}</p>
    {panel.front && <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] font-semibold text-[#3A3A3C]"><span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: panel.front_color }} />{panel.front} · #{panel.phase_order + 1}</p>}
  </div>;
};

const BoardColumn = ({ day, panels, data, selected, admin, busy, onSelect }) => {
  const rest = sunday(day) || day < data.start_date;
  const { setNodeRef, isOver } = useDroppable({ id: day, data: { day }, disabled: !admin || busy || rest });
  return <div ref={setNodeRef} className={`board-column ${rest ? "gantt-rest" : ""} ${selected ? "board-selected" : ""} ${isOver ? "gantt-over" : ""}`} data-testid={`board-column-${day}`}>
    <button className="w-full border-b border-[#E5E5EA] px-2 py-2 text-left" onClick={() => onSelect(day)}>
      <span className="block text-xs font-bold capitalize">{dateLabel(day, "EEE d MMM")}</span>
      <span className="block text-[10px] text-[#636366]">{panels.length} / {rest ? 0 : data.daily_capacity} paneles</span>
    </button>
    <div className="flex-1 space-y-1.5 p-1.5">{panels.map((p) => <BoardCard key={p.object_name} panel={p} disabled={!admin || busy} onSelect={onSelect} />)}</div>
    <div className="border-t border-[#C7C7CC] bg-[#F2F2F7] px-2 py-2 text-xs font-bold" data-testid={`board-area-${day}`}>Total <span className="float-right text-[#007AFF]">{areaLabel(dayArea(panels))}</span></div>
  </div>;
};

export const ScheduleBoard = ({ data, selected, onSelect, admin, busy, onMove, rangeStart, setRangeStart }) => {
  const [drag, setDrag] = useState(null);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftDay(rangeStart, i)).filter((d) => !sunday(d)), [rangeStart]);
  const byDay = useMemo(() => {
    const map = {};
    data.panels.forEach((p) => { if (p.date) (map[p.date] = map[p.date] || []).push(p); });
    Object.values(map).forEach((list) => list.sort((a, b) => (a.phase_order ?? Infinity) - (b.phase_order ?? Infinity) || a.sequence_index - b.sequence_index));
    return map;
  }, [data.panels]);
  const endDrag = async ({ active, over }) => {
    setDrag(null);
    const p = active.data.current.panel;
    if (!over || over.data.current.day === p.date) return;
    if (await onMove(p.object_name, over.data.current.day)) onSelect(over.data.current.day);
  };
  const weekArea = days.reduce((sum, d) => sum + dayArea(byDay[d] || []), 0);
  return <section className="min-w-0" data-testid="schedule-board">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" aria-label="Semana anterior" data-testid="board-previous" disabled={rangeStart <= data.start_date} onClick={() => setRangeStart(shiftDay(rangeStart, -7) < data.start_date ? data.start_date : shiftDay(rangeStart, -7))}><ChevronLeft /></Button>
        <Button variant="outline" size="icon" aria-label="Semana siguiente" data-testid="board-next" onClick={() => setRangeStart(shiftDay(rangeStart, 7))}><ChevronRight /></Button>
      </div>
      <p className="text-xs font-semibold text-[#636366]">{dateLabel(days[0], "d MMM")} – {dateLabel(days[days.length - 1])} · <span className="text-[#007AFF]" data-testid="board-week-area">{areaLabel(weekArea)}</span></p>
    </div>
    <DndContext sensors={sensors} onDragStart={({ active }) => setDrag(active.data.current.panel)} onDragEnd={endDrag} onDragCancel={() => setDrag(null)}>
      <div className="board-scroll">
        {days.map((day) => <BoardColumn key={day} day={day} panels={byDay[day] || []} data={data} selected={selected === day} admin={admin} busy={busy} onSelect={onSelect} />)}
      </div>
      <DragOverlay dropAnimation={null}>{drag && <div className="board-card w-44 shadow-lg" style={{ borderLeftColor: drag.color }}><span className="text-xs font-bold">{drag.code.split(" [")[0]}</span> <span className="text-[11px] font-bold text-[#007AFF]">{areaLabel(drag.area)}</span></div>}</DragOverlay>
    </DndContext>
  </section>;
};

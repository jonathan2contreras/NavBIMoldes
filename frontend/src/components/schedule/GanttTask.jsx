import React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { areaLabel, dateLabel, panelKey, sunday } from "./dates";

export const GanttTask = ({ panel, disabled, onSelect }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: panel.object_name, data: { panel }, disabled });
  return <button ref={setNodeRef} {...attributes} {...listeners} onClick={() => onSelect(panel.date)}
    className={`gantt-task ${disabled ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
    aria-disabled={false}
    style={{ borderColor: panel.color, backgroundColor: /^#[0-9a-f]{6}$/i.test(panel.color) ? `${panel.color}22` : "#F2F2F7", opacity: isDragging ? 0.3 : 1 }}
    title={`${panel.code} · ${panel.molde} · ${areaLabel(panel.area)} · ${panel.floor_label} · ${panel.facade_label} · ${dateLabel(panel.date)}`} aria-label={`${panel.code}, ${panel.molde}, ${panel.floor_label}, ${panel.facade_label}, ${dateLabel(panel.date)}`}
    data-testid={`gantt-panel-${panelKey(panel.object_name)}`}>
    <span className="block truncate font-bold">{panel.code.split(" [")[0]}</span><span className="block truncate text-[9px] text-[#636366]">{panel.code.match(/\[(.*?)\]/)?.[1] || "1 panel"}</span><span className="block truncate text-[9px] font-bold text-[#007AFF]" data-testid={`gantt-panel-area-${panelKey(panel.object_name)}`}>{areaLabel(panel.area)}</span>
  </button>;
};

export const GanttCell = ({ mold, day, panel, selected, admin, busy, start, onSelect }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `${mold.name}|${day}`, data: { day, molde: mold.name }, disabled: !admin || busy });
  const rest = sunday(day) || day < start;
  return <div ref={setNodeRef} data-testid={`gantt-cell-${panelKey(mold.name)}-${day}`} className={`gantt-cell ${rest ? "gantt-rest" : ""} ${selected ? "gantt-selected" : ""} ${isOver ? "gantt-over" : ""}`}>
    {panel ? <GanttTask panel={panel} disabled={!admin || busy} onSelect={onSelect} /> : <button className="h-full w-full rounded-sm focus-visible:outline-[#007AFF]" aria-label={`${mold.name}, ${dateLabel(day)}, ${rest ? "no laborable" : "sin panel"}`} onClick={() => onSelect(day)} data-testid={`gantt-empty-${panelKey(mold.name)}-${day}`} />}
  </div>;
};
import React, { useState } from "react";
import { CalendarClock, Check, X } from "lucide-react";
import { Button } from "../ui/button";
import { areaLabel, panelKey } from "./dates";

export const DayPanelItem = ({ panel, admin, busy, start, onMove }) => {
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(panel.date);
  const apply = async () => { if (target && await onMove(panel.object_name, target)) setEditing(false); };
  return <div className="rounded-lg border border-[#E5E5EA] border-l-[3px] p-3" style={{ borderLeftColor: panel.color }} data-testid={`schedule-day-panel-${panelKey(panel.object_name)}`}>
    <div className="flex items-start justify-between gap-2"><p className="break-words text-xs font-bold" data-testid={`schedule-day-code-${panelKey(panel.object_name)}`}>{panel.code}</p><span className="shrink-0 text-xs font-bold text-[#007AFF]" data-testid={`schedule-day-area-${panelKey(panel.object_name)}`}>{areaLabel(panel.area)}</span></div>
    {panel.front && <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#3A3A3C]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: panel.front_color }} />{panel.front} · #{panel.phase_order + 1}</p>}
    <p className="mt-1 break-words text-xs font-semibold text-[#007AFF]" data-testid={`schedule-day-location-${panelKey(panel.object_name)}`}>{panel.floor_label} · {panel.facade_label}</p>
    <div className="mt-1 flex items-center justify-between gap-2"><span className="min-w-0 break-words text-xs text-[#636366]">{panel.molde} · {panel.tipo || "Sin tipo"}</span>
      {admin && <div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy} onClick={() => setEditing(!editing)} data-testid={`schedule-move-${panelKey(panel.object_name)}`} aria-label={`Cambiar fecha de ${panel.code}`} title="Cambiar fecha"><CalendarClock /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-red-700" disabled={busy} onClick={() => onMove(panel.object_name, null)} data-testid={`schedule-remove-${panelKey(panel.object_name)}`} aria-label={`Quitar ${panel.code} del cronograma`} title="Quitar del día, sin borrar la pieza"><X /></Button></div>}
    </div>
    {admin && editing && <div className="mt-3 flex min-w-0 gap-1 border-t border-[#E5E5EA] pt-3"><input type="date" min={start} value={target} onChange={(e) => setTarget(e.target.value)} className="schedule-input min-w-0 flex-1" data-testid={`schedule-move-date-${panelKey(panel.object_name)}`} aria-label="Nueva fecha de fabricación" /><Button size="icon" disabled={busy || !target} onClick={apply} data-testid={`schedule-move-save-${panelKey(panel.object_name)}`} aria-label="Guardar nueva fecha" title="Guardar nueva fecha"><Check /></Button></div>}
  </div>;
};
import React, { useState } from "react";
import { ListOrdered, Trash2, X } from "lucide-react";

import { api } from "../../lib/api";
import { displayName } from "../../lib/theme";
import { groupPhases, weekLabel } from "../../lib/phases";

export const PhaseListPanel = ({ plan, admin, onClose, onChanged, onFocus }) => {
  const [error, setError] = useState("");
  const run = async (request) => {
    setError("");
    try { onChanged(await request()); } catch (err) { setError(err.message); }
  };
  return (
    <aside className="absolute bottom-4 right-4 top-36 z-40 flex w-[340px] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl" data-testid="phase-list-panel">
      <div className="flex items-center justify-between border-b border-[#E5E5EA] px-4 py-3">
        <div className="flex items-center gap-2"><ListOrdered size={17} /><p className="text-sm font-bold">Lista de instalación · {plan.items.length}</p></div>
        <button onClick={onClose} className="rounded-full p-1 hover:bg-[#F2F2F7]" data-testid="phase-list-close"><X size={17} className="text-[#8E8E93]" /></button>
      </div>
      {!!error && <p className="px-4 pt-2 text-xs text-[#FF3B30]">{error}</p>}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!plan.items.length && <p className="py-6 text-sm text-[#8E8E93]" data-testid="phase-list-empty">Activa la selección múltiple, marca paneles y pulsa «Asignar fase».</p>}
        {groupPhases(plan).map((front) => (
          <section key={front.id} className="mb-4" data-testid={`phase-list-front-${front.id}`}>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: front.color }} />
              <p className="flex-1 text-sm font-bold">{front.name}</p>
              {admin && <button title="Eliminar frente y sus asignaciones" onClick={() => window.confirm(`¿Eliminar ${front.name} y sus asignaciones?`) && run(() => api.deleteFront(front.id))} data-testid={`phase-delete-front-${front.id}`}><Trash2 size={14} className="text-[#8E8E93]" /></button>}
            </div>
            {!front.weeks.length && <p className="mt-1 text-xs text-[#8E8E93]">Sin paneles</p>}
            {front.weeks.map(({ week, items }) => (
              <div key={week} className="mt-2 border-l-2 pl-3" style={{ borderColor: front.color }}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#636366]">Semana {weekLabel(week)} · {items.length}</p>
                {items.map((item) => (
                  <div key={item.object_name} className="flex items-center gap-2 py-1 text-xs">
                    <span className="w-7 shrink-0 text-right tabular-nums text-[#8E8E93]">{item.order + 1}.</span>
                    <button className="min-w-0 flex-1 truncate text-left font-semibold hover:text-[#007AFF]" onClick={() => onFocus(item.object_name)}>{displayName(item.object_name)}</button>
                    {admin && <button title="Quitar de la lista" onClick={() => run(() => api.unassignPhase([item.object_name]))} data-testid="phase-unassign"><X size={13} className="text-[#8E8E93]" /></button>}
                  </div>
                ))}
              </div>
            ))}
          </section>
        ))}
      </div>
      <p className="border-t border-[#E5E5EA] px-4 py-2 text-[11px] text-[#636366]">El cronograma usa esta lista al recalcular: cada panel dentro de su semana, en este orden.</p>
    </aside>
  );
};

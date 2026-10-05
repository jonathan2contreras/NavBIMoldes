import React, { useState } from "react";
import { ListOrdered, Pencil, Trash2, X } from "lucide-react";

import { api } from "../../lib/api";
import { displayName } from "../../lib/theme";
import { FRONT_COLORS, groupPhases, weekLabel } from "../../lib/phases";

export const PhaseListPanel = ({ plan, admin, onClose, onChanged, onFocus }) => {
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // front id being edited
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState("#2E86DE");
  const [saving, setSaving] = useState(false);
  const run = async (request) => {
    setError("");
    try { onChanged(await request()); } catch (err) { setError(err.message); }
  };
  const openEditor = (front) => {
    if (editing === front.id) { setEditing(null); return; }
    setError("");
    setDraftName(front.name);
    setDraftColor(front.color.toUpperCase());
    setEditing(front.id);
  };
  const save = async (front) => {
    const name = draftName.trim();
    if (!name) { setError("El nombre no puede estar vacío."); return; }
    const body = {};
    if (name !== front.name) body.name = name;
    if (draftColor.toUpperCase() !== front.color.toUpperCase()) body.color = draftColor;
    if (!Object.keys(body).length) { setEditing(null); return; }
    setSaving(true); setError("");
    try { onChanged(await api.updateFront(front.id, body)); setEditing(null); } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const remove = (front) => {
    if (!window.confirm(`¿Eliminar ${front.name} y sus asignaciones?`)) return;
    setEditing(null);
    run(() => api.deleteFront(front.id));
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
              {admin ? (
                <button type="button" title="Editar frente" aria-label={`Editar ${front.name}`} data-testid={`phase-color-btn-${front.id}`}
                  onClick={() => openEditor(front)}
                  className="h-4 w-4 rounded-full border-2 border-white shadow ring-1 ring-[#C7C7CC] hover:ring-[#1C1C1E]" style={{ backgroundColor: front.color }} />
              ) : (
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: front.color }} />
              )}
              <p className="flex-1 truncate text-sm font-bold">{front.name}</p>
              {admin && <button title="Editar nombre y color" onClick={() => openEditor(front)} data-testid={`phase-edit-front-${front.id}`}><Pencil size={14} className="text-[#8E8E93]" /></button>}
              {admin && <button title="Eliminar frente y sus asignaciones" onClick={() => remove(front)} data-testid={`phase-delete-front-${front.id}`}><Trash2 size={14} className="text-[#8E8E93]" /></button>}
            </div>
            {admin && editing === front.id && (
              <div className="mt-2 space-y-2 rounded-xl bg-[#F2F2F7] p-3" data-testid={`phase-color-editor-${front.id}`}
                onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }}>
                <input value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={60} autoFocus aria-label="Nombre del frente" placeholder="Nombre del frente"
                  onKeyDown={(e) => e.key === "Enter" && save(front)} data-testid={`phase-edit-name-${front.id}`}
                  className="h-9 w-full rounded-lg bg-white px-3 text-sm outline-none" />
                <div className="flex flex-wrap items-center gap-1.5">
                  {FRONT_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setDraftColor(c)} aria-label={`Color ${c}`} aria-pressed={draftColor === c}
                      className="h-6 w-6 rounded-full border-2 border-white shadow aria-pressed:ring-2 aria-pressed:ring-[#1C1C1E]" style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={draftColor} onChange={(e) => setDraftColor(e.target.value.toUpperCase())} aria-label="Otro color" data-testid={`phase-color-custom-${front.id}`}
                    className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0" />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setEditing(null)} data-testid={`phase-edit-cancel-${front.id}`} className="h-8 rounded-full px-3 text-xs font-semibold text-[#636366]">Cancelar</button>
                  <button type="button" onClick={() => save(front)} disabled={saving || !draftName.trim()} data-testid={`phase-edit-save-${front.id}`}
                    className="h-8 rounded-full bg-[#1C1C1E] px-3 text-xs font-bold text-white disabled:opacity-50">{saving ? "Guardando…" : "Guardar"}</button>
                </div>
              </div>
            )}
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
      <p className="border-t border-[#E5E5EA] px-4 py-2 text-[11px] text-[#636366]">Las semanas son de instalación en obra. Al recalcular, la fabricación arranca en la fecha de inicio del cronograma y sigue este orden.</p>
    </aside>
  );
};

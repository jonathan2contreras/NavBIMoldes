import React, { useEffect, useState } from "react";
import { CalendarRange, Loader2, Plus, X } from "lucide-react";

import { api } from "../../lib/api";
import { weekLabel, weekMonday } from "../../lib/phases";

export const PhaseAssignModal = ({ objectNames, plan, onClose, onChanged, onAssigned }) => {
  const [frontId, setFrontId] = useState(plan.fronts[plan.fronts.length - 1]?.id || "");
  const [newFront, setNewFront] = useState("");
  const [day, setDay] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async (request) => {
    setSaving(true);
    setError("");
    try {
      return await request();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const createFront = async () => {
    const result = await run(() => api.createFront(newFront.trim()));
    if (result) {
      onChanged(result);
      setFrontId(result.fronts[result.fronts.length - 1].id);
      setNewFront("");
    }
  };

  const assign = async () => {
    const result = await run(() => api.assignPhase({ object_names: objectNames, front_id: frontId, week: weekMonday(day) }));
    if (result) {
      onChanged(result);
      onAssigned();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => !saving && onClose()} data-testid="phase-assign-modal">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#E5E5EA] px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarRange size={18} />
            <p className="text-base font-bold text-[#111111]">Asignar fase · {objectNames.length} piezas</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-[#F2F2F7]" data-testid="phase-assign-close">
            <X size={18} className="text-[#8E8E93]" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#636366]">Frente</p>
            <div className="flex flex-wrap gap-2" data-testid="phase-front-options">
              {plan.fronts.map((f) => (
                <button key={f.id} onClick={() => setFrontId(f.id)} data-testid={`phase-front-${f.id}`}
                  className="flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold"
                  style={frontId === f.id ? { backgroundColor: f.color, borderColor: f.color, color: "#FFF" } : { borderColor: "#C7C7CC", color: "#3A3A3C" }}>
                  <span className="h-2.5 w-2.5 rounded-full border border-white/70" style={{ backgroundColor: f.color }} />
                  {f.name}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input value={newFront} onChange={(e) => setNewFront(e.target.value)} placeholder="Nuevo frente (ej. Frente 1)"
                className="h-10 min-w-0 flex-1 rounded-xl bg-[#F2F2F7] px-3 text-sm outline-none" data-testid="phase-new-front-input" />
              <button onClick={createFront} disabled={saving || !newFront.trim()} data-testid="phase-new-front-button"
                className="flex h-10 items-center gap-1 rounded-xl border border-[#C7C7CC] px-3 text-xs font-bold disabled:opacity-50">
                <Plus size={14} /> Crear
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#636366]">Semana de fabricación</p>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} data-testid="phase-week-input"
              className="h-10 w-full rounded-xl bg-[#F2F2F7] px-3 text-sm outline-none" />
            {day && <p className="mt-1.5 text-xs font-semibold text-[#007AFF]" data-testid="phase-week-label">Semana del {weekLabel(weekMonday(day))} (lun–sáb)</p>}
          </div>

          <p className="text-xs text-[#636366]">Las piezas se añaden al final de la lista de instalación en el orden en que las seleccionaste. Su etiqueta de molde no cambia.</p>
          {!!error && <p className="text-[13px] text-[#FF3B30]" data-testid="phase-assign-error">{error}</p>}
        </div>

        <div className="border-t border-[#E5E5EA] p-4">
          <button onClick={assign} disabled={saving || !frontId || !day} data-testid="phase-assign-apply"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#1C1C1E] text-base font-bold text-white disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : `Añadir ${objectNames.length} piezas a la lista`}
          </button>
        </div>
      </div>
    </div>
  );
};

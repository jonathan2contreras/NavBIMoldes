import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, Plus, RefreshCw, Save, X } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { dateLabel } from "./dates";
import { goalText } from "./goal";

const UNITS = [["panels", "Paneles"], ["m2", "m²"]];
const initial = (data) => ({ unit: data.capacity_unit || "panels", capacity: String(data.daily_capacity), area: data.daily_area != null ? String(data.daily_area) : "" });

export const ScheduleControls = ({ data, admin, busy, onGenerate, onSave, onFill }) => {
  const [start, setStart] = useState(data.start_date);
  const [goal, setGoal] = useState(initial(data));
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const editing = useRef(false);
  useEffect(() => {
    if (!editing.current) { setStart(data.start_date); setGoal(initial(data)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.start_date, data.daily_capacity, data.capacity_unit, data.daily_area]);
  const saved = initial(data);
  const goalChanged = goal.unit !== saved.unit || (goal.unit === "panels" ? goal.capacity !== saved.capacity : goal.area !== saved.area);
  const changed = start !== data.start_date || goalChanged;
  const reset = () => { editing.current = false; setStart(data.start_date); setGoal(initial(data)); setError(""); };
  const edit = (patch) => { editing.current = true; setGoal((g) => ({ ...g, ...patch })); setError(""); };
  const generate = async (config) => {
    const result = await onGenerate(config);
    setPending(null);
    if (result) { editing.current = false; setStart(result.start_date); setGoal(initial(result)); }
    return result;
  };
  const submit = (event) => {
    event.preventDefault(); setError("");
    const value = goal.unit === "panels" ? goal.capacity : goal.area;
    const number = Number(value);
    const goalOk = value.trim() !== "" && Number.isFinite(number) && (goal.unit === "panels" ? Number.isInteger(number) && number >= 1 && number <= 1000 : number >= 0.01 && number <= 100000);
    if (!start || start < "2000-01-01" || start > "2090-12-31" || !goalOk) {
      setError(goal.unit === "panels" ? "Introduce una fecha válida y una cantidad entera entre 1 y 1.000 paneles diarios." : "Introduce una fecha válida y un objetivo entre 0,01 y 100.000 m² diarios.");
      return;
    }
    const config = goal.unit === "panels"
      ? { start_date: start, capacity_unit: "panels", daily_capacity: number, revision: data.revision }
      : { start_date: start, capacity_unit: "m2", daily_area: number, revision: data.revision };
    if (!data.saved && !changed) onSave();
    else if (data.saved) setPending(config);
    else generate(config);
  };
  const area = goal.unit === "m2";
  return <section className="border-y border-[#E5E5EA] py-4" data-testid="schedule-settings">
    {admin ? <form noValidate onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-[#636366]" htmlFor="schedule-start">Fecha de inicio<input id="schedule-start" data-testid="schedule-start-input" type="date" min="2000-01-01" max="2090-12-31" value={start} onChange={(e) => { editing.current = true; setStart(e.target.value); setError(""); }} disabled={busy} className="schedule-input" /></label>
      <div className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-[#636366]">
        <span id="schedule-goal-label">Objetivo diario</span>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#C7C7CC] p-0.5" role="radiogroup" aria-labelledby="schedule-goal-label" data-testid="schedule-unit-toggle">
            {UNITS.map(([key, label]) => <button key={key} type="button" role="radio" aria-checked={goal.unit === key} disabled={busy} onClick={() => edit({ unit: key })} data-testid={`schedule-unit-${key}`}
              className={`h-8 rounded-md px-3 text-xs font-bold ${goal.unit === key ? "bg-[#1C1C1E] text-white" : "text-[#3A3A3C]"}`}>{label}</button>)}
          </div>
          {area
            ? <input id="schedule-area" data-testid="schedule-area-input" aria-label="Metros cuadrados por día" type="number" min="0.01" max="100000" step="0.01" inputMode="decimal" value={goal.area} onChange={(e) => edit({ area: e.target.value })} disabled={busy} className="schedule-input w-32" />
            : <input id="schedule-capacity" data-testid="schedule-capacity-input" aria-label="Paneles por día" type="number" min="1" max="1000" step="1" inputMode="numeric" value={goal.capacity} onChange={(e) => edit({ capacity: e.target.value })} disabled={busy} className="schedule-input w-28" />}
          <span className="text-xs font-semibold text-[#636366]">{area ? "m² por día" : "paneles por día"}</span>
        </div>
      </div>
      <Button type="submit" className="h-10" disabled={busy || !!data.awaiting_location} data-testid="schedule-generate-button">{!data.saved && !changed ? <Save /> : <RefreshCw />}{busy ? "Aplicando…" : data.needs_replan ? "Recalcular cronograma" : changed ? "Aplicar cambios" : !data.saved ? "Guardar cronograma" : "Recalcular todo"}</Button>
      {changed && <Button type="button" variant="ghost" disabled={busy} onClick={reset} data-testid="schedule-discard-settings"><X /> Descartar</Button>}
      <Button type="button" variant="outline" className="h-10" disabled={busy || !data.unscheduled || changed || data.needs_replan || !!data.awaiting_location} onClick={onFill} data-testid="schedule-fill-button"><Plus /> Programar pendientes</Button>
    </form> : <div className="flex flex-wrap gap-5 text-sm" data-testid="schedule-readonly-settings"><span><CalendarDays size={15} className="mr-2 inline" />Inicio: <strong>{dateLabel(data.start_date)}</strong></span><span>Objetivo: <strong>{goalText(data)}</strong></span></div>}
    {admin && changed && <p role="status" className="mt-3 text-xs font-semibold text-[#AE6500]" data-testid="schedule-settings-draft">Cambios sin aplicar · Objetivo actual del calendario: {goalText(data)}</p>}
    <p className="mt-3 text-xs text-[#636366]" data-testid="schedule-working-days">Lunes a sábado automáticos · domingos solo a mano · 1 panel por copia de molde al día{data.capacity_unit === "m2" ? " · cada día se completa hasta llegar a los m² del objetivo (el último panel puede pasarse)" : ""}</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700" data-testid="schedule-settings-error">{error}</p>}
    <Dialog open={!!pending} onOpenChange={(open) => { if (!busy && !open) setPending(null); }}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-md rounded-lg" data-testid="schedule-replan-dialog" closeTestId="schedule-replan-close" overlayTestId="schedule-replan-overlay">
        <DialogTitle className="pr-5 tracking-normal" data-testid="schedule-replan-title">¿Aplicar el objetivo diario?</DialogTitle>
        <DialogDescription data-testid="schedule-replan-description">Se reemplazarán las fechas guardadas, incluidos los cambios manuales y los domingos que hayas rellenado. Se priorizará completar el objetivo diario con moldes distintos, adelantando piezas de otras fachadas o plantas cuando sea necesario. Las piezas y sus moldes no se modificarán.</DialogDescription>
        <p className="text-sm" data-testid="schedule-replan-values">Inicio: {dateLabel(pending?.start_date)} · {pending && goalText(pending)}</p>
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setPending(null)} data-testid="schedule-replan-cancel">Cancelar</Button><Button type="button" disabled={busy || !pending} onClick={() => generate(pending)} data-testid="schedule-replan-confirm">Aplicar y guardar</Button></div>
      </DialogContent>
    </Dialog>
  </section>;
};

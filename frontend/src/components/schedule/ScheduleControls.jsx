import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, Plus, RefreshCw, Save, X } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { dateLabel } from "./dates";

export const ScheduleControls = ({ data, admin, busy, onGenerate, onSave, onFill }) => {
  const [start, setStart] = useState(data.start_date);
  const [capacity, setCapacity] = useState(String(data.daily_capacity));
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const editing = useRef(false);
  useEffect(() => {
    if (!editing.current) { setStart(data.start_date); setCapacity(String(data.daily_capacity)); }
  }, [data.start_date, data.daily_capacity]);
  const changed = start !== data.start_date || capacity !== String(data.daily_capacity);
  const reset = () => {
    editing.current = false; setStart(data.start_date); setCapacity(String(data.daily_capacity)); setError("");
  };
  const generate = async (config) => {
    const result = await onGenerate(config.start_date, config.daily_capacity, config.revision);
    setPending(null);
    if (result) { editing.current = false; setStart(result.start_date); setCapacity(String(result.daily_capacity)); }
    return result;
  };
  const submit = (event) => {
    event.preventDefault(); setError("");
    if (!start || start < "2000-01-01" || start > "2090-12-31" || !capacity.trim() || !Number.isInteger(Number(capacity)) || Number(capacity) < 1 || Number(capacity) > 1000) {
      setError("Introduce una fecha válida y una cantidad entera entre 1 y 1.000 paneles diarios."); return;
    }
    const config = { start_date: start, daily_capacity: Number(capacity), revision: data.revision };
    if (!data.saved && !changed) onSave();
    else if (data.saved) setPending(config);
    else generate(config);
  };
  return <section className="border-y border-[#E5E5EA] py-4" data-testid="schedule-settings">
    {admin ? <form noValidate onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-[#636366]" htmlFor="schedule-start">Fecha de inicio<input id="schedule-start" data-testid="schedule-start-input" type="date" min="2000-01-01" max="2090-12-31" value={start} onChange={(e) => { editing.current = true; setStart(e.target.value); setError(""); }} disabled={busy} className="schedule-input" /></label>
      <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-[#636366]" htmlFor="schedule-capacity">Objetivo: paneles por día<input id="schedule-capacity" data-testid="schedule-capacity-input" type="number" min="1" max="1000" step="1" inputMode="numeric" value={capacity} onChange={(e) => { editing.current = true; setCapacity(e.target.value); setError(""); }} disabled={busy} className="schedule-input w-36" /></label>
      <Button type="submit" className="h-10" disabled={busy || !!data.awaiting_location} data-testid="schedule-generate-button">{!data.saved && !changed ? <Save /> : <RefreshCw />}{busy ? "Aplicando…" : data.needs_replan ? "Recalcular cronograma" : changed ? "Aplicar cambios" : !data.saved ? "Guardar cronograma" : "Recalcular todo"}</Button>
      {changed && <Button type="button" variant="ghost" disabled={busy} onClick={reset} data-testid="schedule-discard-settings"><X /> Descartar</Button>}
      <Button type="button" variant="outline" className="h-10" disabled={busy || !data.unscheduled || changed || data.needs_replan || !!data.awaiting_location} onClick={onFill} data-testid="schedule-fill-button"><Plus /> Programar pendientes</Button>
    </form> : <div className="flex flex-wrap gap-5 text-sm" data-testid="schedule-readonly-settings"><span><CalendarDays size={15} className="mr-2 inline" />Inicio: <strong>{dateLabel(data.start_date)}</strong></span><span>Objetivo: <strong>{data.daily_capacity} paneles/día</strong></span></div>}
    {admin && changed && <p role="status" className="mt-3 text-xs font-semibold text-[#AE6500]" data-testid="schedule-settings-draft">Cambios sin aplicar · Objetivo actual del calendario: {data.daily_capacity} paneles/día</p>}
    <p className="mt-3 text-xs text-[#636366]" data-testid="schedule-working-days">Lunes a sábado · 1 panel por molde al día</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700" data-testid="schedule-settings-error">{error}</p>}
    <Dialog open={!!pending} onOpenChange={(open) => { if (!busy && !open) setPending(null); }}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-md rounded-lg" data-testid="schedule-replan-dialog" closeTestId="schedule-replan-close" overlayTestId="schedule-replan-overlay">
        <DialogTitle className="pr-5 tracking-normal" data-testid="schedule-replan-title">¿Aplicar el objetivo diario?</DialogTitle>
        <DialogDescription data-testid="schedule-replan-description">Se reemplazarán las fechas guardadas, incluidos los cambios manuales. Se priorizará completar la cantidad diaria con moldes distintos, adelantando piezas de otras fachadas o plantas cuando sea necesario. Las piezas y sus moldes no se modificarán.</DialogDescription>
        <p className="text-sm" data-testid="schedule-replan-values">Inicio: {dateLabel(pending?.start_date)} · {pending?.daily_capacity} paneles/día</p>
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setPending(null)} data-testid="schedule-replan-cancel">Cancelar</Button><Button type="button" disabled={busy || !pending} onClick={() => generate(pending)} data-testid="schedule-replan-confirm">Aplicar y guardar</Button></div>
      </DialogContent>
    </Dialog>
  </section>;
};
import React, { useEffect, useState } from "react";
import { CalendarDays, Plus, RefreshCw, Save } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { dateLabel } from "./dates";

export const ScheduleControls = ({ data, admin, busy, onGenerate, onSave, onFill }) => {
  const [start, setStart] = useState(data.start_date);
  const [capacity, setCapacity] = useState(String(data.daily_capacity));
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setStart(data.start_date); setCapacity(String(data.daily_capacity)); }, [data.start_date, data.daily_capacity]);
  const changed = start !== data.start_date || Number(capacity) !== data.daily_capacity;
  const generate = async () => {
    const result = await onGenerate(start, Number(capacity));
    setConfirm(false);
    return result;
  };
  const submit = (event) => {
    event.preventDefault(); setError("");
    if (!start || start < "2000-01-01" || start > "2090-12-31" || !/^\d+$/.test(capacity) || Number(capacity) < 1 || Number(capacity) > 1000) {
      setError("Introduce una fecha válida y una capacidad entera entre 1 y 1.000 paneles."); return;
    }
    if (!data.saved && !changed) onSave();
    else if (data.saved) setConfirm(true);
    else generate();
  };
  return <section className="border-y border-[#E5E5EA] py-4" data-testid="schedule-settings">
    {admin ? <form noValidate onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-[#636366]" htmlFor="schedule-start">Fecha de inicio<input id="schedule-start" data-testid="schedule-start-input" type="date" min="2000-01-01" max="2090-12-31" value={start} onChange={(e) => setStart(e.target.value)} disabled={busy} className="schedule-input" /></label>
      <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-[#636366]" htmlFor="schedule-capacity">Paneles por día<input id="schedule-capacity" data-testid="schedule-capacity-input" type="number" min="1" max="1000" step="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} disabled={busy} className="schedule-input w-32" /></label>
      <Button type="submit" className="h-10" disabled={busy} data-testid="schedule-generate-button">{!data.saved && !changed ? <Save /> : <RefreshCw />}{!data.saved && !changed ? "Guardar cronograma" : changed ? "Calcular cronograma" : "Recalcular todo"}</Button>
      <Button type="button" variant="outline" className="h-10" disabled={busy || !data.unscheduled || changed} onClick={onFill} data-testid="schedule-fill-button"><Plus /> Programar pendientes</Button>
    </form> : <div className="flex flex-wrap gap-5 text-sm" data-testid="schedule-readonly-settings"><span><CalendarDays size={15} className="mr-2 inline" />Inicio: <strong>{dateLabel(data.start_date)}</strong></span><span>Capacidad: <strong>{data.daily_capacity} paneles/día</strong></span></div>}
    <p className="mt-3 text-xs text-[#636366]" data-testid="schedule-working-days">Lunes a sábado · 1 panel por molde al día</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700" data-testid="schedule-settings-error">{error}</p>}
    <Dialog open={confirm} onOpenChange={(open) => { if (!busy) setConfirm(open); }}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-md rounded-lg" data-testid="schedule-replan-dialog" closeTestId="schedule-replan-close" overlayTestId="schedule-replan-overlay">
        <DialogTitle className="pr-5 tracking-normal">¿Recalcular todo el cronograma?</DialogTitle>
        <DialogDescription data-testid="schedule-replan-description">Se reemplazarán las fechas guardadas, incluidos los cambios manuales. Las piezas y sus moldes no se modificarán.</DialogDescription>
        <p className="text-sm" data-testid="schedule-replan-values">Inicio: {dateLabel(start)} · {capacity} paneles/día</p>
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setConfirm(false)} data-testid="schedule-replan-cancel">Cancelar</Button><Button disabled={busy} onClick={generate} data-testid="schedule-replan-confirm">Recalcular y guardar</Button></div>
      </DialogContent>
    </Dialog>
  </section>;
};
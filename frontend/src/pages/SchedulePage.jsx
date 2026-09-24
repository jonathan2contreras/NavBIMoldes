import React, { useEffect, useState } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { useRole } from "../context/RoleContext";
import { Button } from "../components/ui/button";
import { useSchedule } from "../components/schedule/useSchedule";
import { ScheduleControls } from "../components/schedule/ScheduleControls";
import { ScheduleSummary } from "../components/schedule/ScheduleSummary";
import { GanttTimeline } from "../components/schedule/GanttTimeline";
import { DayDetails } from "../components/schedule/DayDetails";
import { ScheduleSequence } from "../components/schedule/ScheduleSequence";
import { ScheduleProduction } from "../components/schedule/ScheduleProduction";
import "../components/schedule/schedule.css";

export default function SchedulePage() {
  const { isAdmin } = useRole();
  const { data, loading, saving, error, notice, refresh, mutate } = useSchedule();
  const [selected, setSelected] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  useEffect(() => {
    if (data) { setSelected(data.first_date || data.start_date); setRangeStart(data.start_date); }
    // Preserve the selected day on ordinary panel edits/refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.start_date]);
  const select = (day) => setSelected(day);
  const goToDay = (day) => { setSelected(day); setRangeStart(day); };
  const move = (object_name, date) => mutate(() => api.moveSchedulePanel({ object_name, date, revision: data.revision }), date ? "Fecha de fabricación guardada." : "Panel devuelto a pendientes.");
  const generate = async (start_date, daily_capacity, revision) => {
    const result = await mutate(() => api.generateSchedule({ start_date, daily_capacity, revision }), `Objetivo de ${daily_capacity} paneles/día aplicado y guardado.`);
    if (result) { setRangeStart(result.start_date); setSelected(result.first_date || result.start_date); }
    return result;
  };
  return <div className="schedule-page h-full overflow-y-auto bg-white text-[#111111]" data-testid="schedule-screen">
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-6 sm:px-7 sm:pt-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-extrabold sm:text-4xl" data-testid="schedule-title">Cronograma</h1><p className="mt-2 text-sm text-[#636366]">Plan de fabricación · Paneles por molde</p></div>
        <div className="flex items-center gap-3"><span className={`text-xs font-semibold ${data?.saved ? "text-green-700" : "text-[#AE6500]"}`} data-testid="schedule-save-state">{data ? data.saved ? "Cronograma guardado" : "Propuesta inicial · sin guardar" : ""}</span><Button variant="outline" size="icon" disabled={loading || saving} onClick={refresh} title="Actualizar cronograma" aria-label="Actualizar cronograma" data-testid="schedule-refresh"><RefreshCw className={loading ? "animate-spin" : ""} /></Button></div>
      </header>
      {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800" data-testid="schedule-error"><p>{error}</p><Button variant="outline" disabled={saving} onClick={refresh} data-testid="schedule-retry">Actualizar</Button></div>}
      {notice && <p role="status" className="mb-4 flex items-center gap-2 text-xs text-green-700" data-testid="schedule-notice"><Check size={14} />{notice}</p>}
      {!data && loading && <div role="status" className="flex justify-center py-20" data-testid="schedule-loading"><Loader2 className="animate-spin" aria-label="Cargando cronograma" /></div>}
      {data && <>
        <ScheduleControls data={data} admin={isAdmin} busy={saving} onGenerate={generate} onSave={() => mutate(() => api.saveSchedule(data.revision), "Cronograma guardado.")} onFill={() => mutate(() => api.fillSchedule(data.revision), "Pendientes programados sin mover otras piezas.")} />
        <ScheduleSummary data={data} />
        <ScheduleProduction data={data} onSelect={goToDay} />
        <ScheduleSequence data={data} onSelect={goToDay} />
        {data.order_warning && <p role="alert" className="mb-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" data-testid="schedule-order-warning">{data.order_warning} Tus fechas permanecen sin cambios hasta confirmar el recálculo.</p>}
        {data.awaiting_location > 0 && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-800" data-testid="schedule-location-warning">{data.awaiting_location} paneles con molde carecen de localización verificable en el modelo. Revisa su planta y fachada antes de guardar.</p>}
        {data.unscheduled > 0 && !data.needs_replan && <p className="mb-5 text-sm text-[#AE6500]" data-testid="schedule-order-pending">Hay paneles pendientes de programar. Puedes añadirlos a jornadas con capacidad o programar pendientes sin mover las fechas ya fijadas.</p>}
        {data.stale_entries > 0 && <p className="mb-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" data-testid="schedule-stale-warning">{data.stale_entries} asignaciones del cronograma ya no coinciden con el catálogo de moldes. Las piezas con un molde nuevo están pendientes de programar.</p>}
        {rangeStart && selected && <div className="grid min-w-0 gap-6 border-t border-[#E5E5EA] pt-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <GanttTimeline data={data} selected={selected} onSelect={select} admin={isAdmin && !data.needs_replan && !data.awaiting_location} busy={saving} onMove={move} rangeStart={rangeStart} setRangeStart={setRangeStart} />
          <DayDetails data={data} selected={selected} onSelect={goToDay} admin={isAdmin && !data.needs_replan && !data.awaiting_location} busy={saving} onMove={move} />
        </div>}
      </>}
    </div>
  </div>;
}
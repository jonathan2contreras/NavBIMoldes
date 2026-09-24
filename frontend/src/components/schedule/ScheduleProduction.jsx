import React from "react";
import { Gauge, CalendarCheck, CircleAlert } from "lucide-react";

export const ScheduleProduction = ({ data, onSelect }) => {
  const firstLimited = data.production_days.find((day) => day.status === "mold_limit");
  return <section className="mb-5 border-l-2 border-[#007AFF] bg-[#F2F2F7] px-4 py-3" data-testid="schedule-production-summary">
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
      <p className="flex items-center gap-2 font-bold" data-testid="schedule-target-rate"><Gauge size={16} className="shrink-0 text-[#007AFF]" />Objetivo: {data.daily_capacity} paneles/día</p>
      <p className="flex items-center gap-2 text-[#18824B]" data-testid="schedule-full-days"><CalendarCheck size={15} />{data.full_capacity_days} jornadas completas</p>
      {firstLimited && <button type="button" className="flex items-center gap-2 text-left font-semibold text-[#945700] hover:underline" onClick={() => onSelect(firstLimited.date)} data-testid="schedule-limited-days"><CircleAlert size={15} className="shrink-0" />{data.limited_capacity_days} jornadas limitadas por moldes</button>}
      {data.manual_gap_days > 0 && <p className="text-[#636366]" data-testid="schedule-manual-gap-days">{data.manual_gap_days} jornadas con huecos en las fechas fijadas</p>}
    </div>
    {data.bottleneck_mold && <p className="mt-3 text-xs text-[#636366]" data-testid="schedule-bottleneck">{data.bottleneck_mold}: {data.bottleneck_panels} paneles requieren al menos {data.bottleneck_panels} jornadas con un solo molde. No se duplican moldes para completar el objetivo.</p>}
  </section>;
};
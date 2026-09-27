import React from "react";
import { Gauge } from "lucide-react";
import { areaLabel, dayArea } from "./dates";

/** Average m² per working day needed to fabricate every panel within the planned working days. */
export const DailyAreaTarget = ({ data }) => {
  const days = data.working_day_span || 0;
  if (!days) return null;
  const total = dayArea(data.panels);
  return <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EDF6FF] px-3 py-1.5 text-xs font-semibold text-[#0B4F9C]" title={`${areaLabel(total)} en ${days} jornadas (lunes a sábado)`} data-testid="schedule-daily-area">
    <Gauge size={14} /> Media necesaria: {areaLabel(total / days)}/día
    <span className="font-normal text-[#3A6FB0]">· {areaLabel(total)} en {days} jornadas</span>
  </span>;
};

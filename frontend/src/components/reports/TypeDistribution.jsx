import React from "react";
import { NO_MOLDE_COLOR } from "../../lib/theme";
import { number, percent, testKey } from "./reportData";

export const TypeDistribution = ({ groups, data, onType, onUnassigned }) => {
  const segments = [...groups];
  if (data.sin_molde) segments.push({ key: "unassigned", name: "Sin molde", count: data.sin_molde, color: NO_MOLDE_COLOR });
  let cursor = 0;
  const stops = segments.filter((g) => g.count > 0).map((g) => {
    const start = cursor;
    cursor += g.count / data.total * 100;
    return `${g.color} ${start}% ${cursor}%`;
  });
  return <section className="min-w-0 border-t border-[#E5E5EA] pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0" data-testid="report-type-distribution">
    <h2 className="text-base font-bold md:text-lg">Distribución por tipo</h2>
    <div className="my-6 flex justify-center">
      <div className="relative flex aspect-square w-40 items-center justify-center rounded-full" role="img" aria-label={`Distribución de ${number(data.total)} paneles por tipo`} data-testid="report-type-chart"
        style={{ background: stops.length ? `conic-gradient(${stops.join(",")})` : "#E5E5EA" }}>
        <div className="flex aspect-square w-[120px] flex-col items-center justify-center rounded-full bg-white">
          <span className="text-3xl font-extrabold tabular-nums" data-testid="report-type-chart-total">{number(data.total)}</span><span className="text-xs text-[#636366]">paneles</span>
        </div>
      </div>
    </div>
    <div className="space-y-1">
      {segments.map((group) => <button key={group.key} className="flex w-full items-center gap-2 rounded-md py-2.5 text-left transition-colors hover:bg-[#F2F2F7] focus-visible:outline-[#007AFF]"
        data-testid={`report-type-${testKey(group.key)}`} onClick={() => group.key === "unassigned" ? onUnassigned() : onType(group.key)} title={`Filtrar: ${group.name}`}>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} aria-hidden="true" />
        <span className="min-w-0 flex-1 break-words text-xs font-semibold" data-testid={`report-type-name-${testKey(group.key)}`}>{group.name}</span>
        <span className="text-sm font-bold tabular-nums" data-testid={`report-type-count-${testKey(group.key)}`}>{number(group.count)}</span>
        <span className="w-14 shrink-0 text-right text-xs tabular-nums text-[#636366]" data-testid={`report-type-share-${testKey(group.key)}`}>{percent(group.count, data.total)} %</span>
      </button>)}
    </div>
  </section>;
};
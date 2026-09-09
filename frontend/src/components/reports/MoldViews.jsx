import React from "react";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { NO_MOLDE_COLOR } from "../../lib/theme";
import { number, percent, testKey } from "./reportData";

export const MoldBars = ({ rows, onSelect }) => {
  const maximum = Math.max(1, ...rows.map((row) => row.count));
  return <div data-testid="report-bars" className="space-y-1">
    {rows.map((row) => <button key={row.molde} data-testid={`report-bar-${testKey(row.molde)}`} onClick={() => onSelect(row.molde)}
      className="group grid w-full grid-cols-[72px_minmax(0,1fr)_36px] items-center gap-3 rounded-md px-1 py-2 text-left transition-colors hover:bg-[#F2F2F7] focus-visible:outline-[#007AFF] sm:grid-cols-[104px_minmax(0,1fr)_40px]"
      title={`${row.molde} · ${row.tipo || "Sin tipo"} · ${number(row.count)} paneles. Filtrar por molde`}>
      <span className="break-words text-xs font-semibold sm:text-sm" data-testid={`report-bar-name-${testKey(row.molde)}`}>{row.molde}</span>
      <span className="h-4 min-w-0 rounded-sm bg-[#F2F2F7]" aria-hidden="true">
        <span className="block h-full rounded-sm border border-black/10 transition-[width] duration-500 motion-reduce:transition-none" data-testid={`report-bar-fill-${testKey(row.molde)}`}
          style={{ width: `${row.count / maximum * 100}%`, backgroundColor: row.color || NO_MOLDE_COLOR, borderWidth: row.count ? 1 : 0 }} />
      </span>
      <span className="text-right text-sm font-bold tabular-nums" data-testid={`report-mold-count-${row.molde}`}>{number(row.count)}</span>
    </button>)}
    {!rows.length && <p className="py-10 text-sm text-[#636366]" data-testid="report-bars-empty">Sin moldes para esta selección.</p>}
    <p className="pt-3 text-xs text-[#636366]" data-testid="report-bars-unit">Cantidad de paneles por molde</p>
  </div>;
};

export const MoldCards = ({ rows, total, onSelect }) => {
  const maximum = Math.max(0, ...rows.map((row) => row.count));
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="report-cards">
    {rows.map((row) => <button key={row.molde} data-testid={`report-mold-card-${testKey(row.molde)}`} onClick={() => onSelect(row.molde)}
      className="group relative min-w-0 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white p-5 text-left transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-[#007AFF]">
      <span className="absolute inset-y-0 left-0 w-1.5 border-r border-black/5" style={{ backgroundColor: row.color || NO_MOLDE_COLOR }} aria-hidden="true" />
      <div className="flex min-h-6 items-center justify-between gap-2">
        {maximum > 0 && row.count === maximum ? <span className="flex items-center gap-1 text-xs font-semibold text-[#007AFF]" data-testid={`report-mold-top-${testKey(row.molde)}`}><TrendingUp size={13} /> Más utilizado</span> : <span className="text-xs text-[#636366]">Molde</span>}
        <ArrowUpRight size={16} className="shrink-0 text-[#8E8E93] transition-transform group-hover:translate-x-0.5" />
      </div>
      <h3 className="mt-3 break-words text-lg font-bold" data-testid={`report-card-name-${testKey(row.molde)}`}>{row.molde}</h3>
      <p className="mt-1 break-words text-xs text-[#636366]" data-testid={`report-card-type-${testKey(row.molde)}`}>{row.tipo || "Sin tipo"}</p>
      <div className="mt-5 flex flex-wrap items-baseline gap-2"><span className="text-3xl font-extrabold tabular-nums" data-testid={`report-card-count-${testKey(row.molde)}`}>{number(row.count)}</span><span className="text-xs text-[#636366]">paneles</span></div>
      <p className="mt-2 text-xs text-[#636366]" data-testid={`report-card-share-${testKey(row.molde)}`}>{percent(row.count, total)} % del total</p>
    </button>)}
    {!rows.length && <p className="py-8 text-sm text-[#636366]" data-testid="report-cards-empty">Sin moldes para esta selección.</p>}
  </div>;
};
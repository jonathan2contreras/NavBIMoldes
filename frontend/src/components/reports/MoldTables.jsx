import React from "react";
import { NO_MOLDE_COLOR } from "../../lib/theme";
import { number, percent, testKey } from "./reportData";

const MoldRow = ({ row, total, onSelect, prefix, showType }) => <tr className="border-b border-[#E5E5EA]" data-testid={`${prefix}-row-${testKey(row.molde)}`}>
  <th scope="row" className="py-3 pr-2 text-left font-semibold">
    <button className="flex max-w-full items-center gap-2 text-left hover:underline focus-visible:outline-[#007AFF]" data-testid={`${prefix}-select-${testKey(row.molde)}`} onClick={() => onSelect(row.molde)}>
      <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: row.color || NO_MOLDE_COLOR }} aria-hidden="true" /><span className="break-words">{row.molde}</span>
    </button>
    {showType && <span className="mt-1 block break-words pl-[18px] text-xs font-normal text-[#636366] sm:hidden">{row.tipo || "Sin tipo"}</span>}
  </th>
  {showType && <td className="hidden break-words pr-3 text-[#636366] sm:table-cell" data-testid={`${prefix}-type-${testKey(row.molde)}`}>{row.tipo || "Sin tipo"}</td>}
  <td className="py-3 text-right font-bold tabular-nums" data-testid={`${prefix}-count-${testKey(row.molde)}`}>{number(row.count)}</td>
  <td className="py-3 pl-2 text-right tabular-nums text-[#636366]" data-testid={`${prefix}-share-${testKey(row.molde)}`}>{percent(row.count, total)} %</td>
</tr>;

export const MoldDetailTable = ({ rows, data, onSelect }) => <section className="mt-8 border-t border-[#E5E5EA] pt-6" data-testid="report-mold-detail">
  <h2 className="mb-4 text-base font-bold md:text-lg">Detalle por molde</h2>
  <table className="w-full table-fixed text-xs sm:text-sm" data-testid="report-mold-detail-table">
    <thead><tr className="border-b border-[#E5E5EA] text-xs text-[#636366]"><th className="w-[42%] py-3 text-left sm:w-[30%]">Molde</th><th className="hidden text-left sm:table-cell">Tipo</th><th className="w-[28%] text-right sm:w-[18%]">Paneles</th><th className="w-[30%] text-right sm:w-[18%]">% total</th></tr></thead>
    <tbody>{rows.map((row) => <MoldRow key={row.molde} row={row} total={data.total} onSelect={onSelect} prefix="report-detail" showType />)}</tbody>
    <tfoot><tr className="bg-[#F2F2F7] font-bold"><td className="py-3">Total asignados</td><td className="hidden sm:table-cell" /><td className="text-right" data-testid="report-detail-total">{number(data.con_molde)}</td><td className="text-right">{percent(data.con_molde, data.total)} %</td></tr></tfoot>
  </table>
</section>;

export const TypeMatrix = ({ groups, data, onSelect }) => <section data-testid="report-matrix">
  <h2 className="mb-5 text-base font-bold md:text-lg">Moldes agrupados por tipo</h2>
  <div className="space-y-6">
    {groups.map((group) => <section key={group.key} data-testid={`report-matrix-group-${testKey(group.key)}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-l-2 bg-[#F2F2F7] px-3 py-3" style={{ borderColor: group.color }}>
        <h3 className="min-w-0 break-words text-sm font-bold" data-testid={`report-matrix-type-${testKey(group.key)}`}>{group.name}</h3>
        <span className="text-xs font-semibold text-[#636366]" data-testid={`report-matrix-subtotal-${testKey(group.key)}`}>{number(group.count)} paneles · {group.rows.length} moldes</span>
      </div>
      <table className="w-full table-fixed text-xs sm:text-sm" aria-label={`Moldes de tipo ${group.name}`}>
        <thead><tr className="text-xs text-[#636366]"><th className="w-[44%] py-3 text-left sm:w-[60%]">Molde</th><th className="w-[28%] text-right sm:w-[20%]">Paneles</th><th className="w-[28%] text-right sm:w-[20%]">% total</th></tr></thead>
        <tbody>{group.rows.map((row) => <MoldRow key={row.molde} row={row} total={data.total} onSelect={onSelect} prefix="report-matrix" />)}</tbody>
      </table>
    </section>)}
    {!groups.length && <p className="text-sm text-[#636366]" data-testid="report-matrix-empty">Sin moldes para esta selección.</p>}
  </div>
  <div className="mt-6 space-y-3 border-t-2 border-[#E5E5EA] py-4 text-sm">
    <p className="flex justify-between gap-2"><span>Total asignados</span><strong data-testid="report-matrix-assigned">{number(data.con_molde)}</strong></p>
    <p className="flex justify-between gap-2 text-[#636366]"><span>Sin molde</span><strong data-testid="report-matrix-unassigned">{number(data.sin_molde)}</strong></p>
    <p className="flex justify-between gap-2 font-bold"><span>Total general</span><span data-testid="report-matrix-total">{number(data.total)}</span></p>
  </div>
</section>;
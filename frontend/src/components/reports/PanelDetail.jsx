import React, { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { displayName, FACADE_LABELS, NO_MOLDE_COLOR } from "../../lib/theme";
import { number } from "./reportData";

export const PanelDetail = ({ items }) => {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / 50));
  const current = Math.min(page, pages - 1);
  return <section className="mt-8 border-t border-[#E5E5EA] pt-2" data-testid="report-list">
    <button className="flex w-full items-center justify-between gap-2 py-5 text-left" data-testid="report-panels-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="report-panels-content">
      <h2 className="text-base font-bold md:text-lg">Paneles de la selección <span className="ml-2 text-sm font-normal text-[#636366]" data-testid="report-panel-count">{number(items.length)}</span></h2>
      <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div id="report-panels-content" data-testid="report-panels-content">
      {!items.length ? <p className="py-6 text-sm text-[#636366]" data-testid="report-panels-empty">Sin paneles para los filtros seleccionados.</p> : items.slice(current * 50, (current + 1) * 50).map((item) => <div key={item.name} data-testid={`report-row-${item.name}`} className="flex items-center gap-3 border-b border-[#E5E5EA] py-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: item.color || NO_MOLDE_COLOR }} aria-hidden="true" />
        <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{displayName(item.name)}</p><p className="mt-1 break-words text-xs text-[#636366]">{FACADE_LABELS[item.facade] || "—"} · {item.molde || "Sin molde"}{item.molde ? ` · ${item.tipo || "Sin tipo"}` : ""}{item.ancho && item.alto ? ` · ${item.ancho} × ${item.alto} m` : ""}</p></div>
      </div>)}
      {items.length > 50 && <div className="flex items-center justify-between gap-2 py-4">
        <p className="text-xs text-[#636366]" data-testid="report-panels-page">{current * 50 + 1}–{Math.min((current + 1) * 50, items.length)} de {number(items.length)}</p>
        <div className="flex gap-2"><Button variant="outline" size="icon" data-testid="report-panels-previous" aria-label="Paneles anteriores" onClick={() => setPage(current - 1)} disabled={current === 0}><ChevronLeft /></Button><Button variant="outline" size="icon" data-testid="report-panels-next" aria-label="Paneles siguientes" onClick={() => setPage(current + 1)} disabled={current + 1 >= pages}><ChevronRight /></Button></div>
      </div>}
    </div>}
  </section>;
};
import React, { useCallback, useEffect, useState } from "react";
import { Compass, FileText, Grid3X3, Layers, Loader2 } from "lucide-react";

import { api, BACKEND_URL } from "../lib/api";
import { Chip } from "../components/Chip";
import { FACADE_FILTERS, FACADE_LABELS, NO_MOLDE_COLOR, displayName, tipoLabel } from "../lib/theme";

export default function ReportsPage() {
  const [facade, setFacade] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  const fetchReport = useCallback(async (fac) => {
    setLoading(true);
    setError("");
    try {
      setData(await api.getMoldsReport(fac));
    } catch {
      setError("Error al generar el reporte.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(facade);
  }, [facade, fetchReport]);

  const exportReport = useCallback(
    (format) => {
      const url = `${BACKEND_URL}/api/report/molds/export?format=${format}&facade=${facade}`;
      setExporting(format);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_moldes_${facade}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => setExporting(""), 800);
    },
    [facade]
  );

  return (
    <div className="h-full overflow-y-auto bg-white" data-testid="reports-screen">
      <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-4">
        <h1 className="text-2xl font-extrabold text-[#111111]">Reportes</h1>
        <p className="mt-0.5 text-[13px] text-[#636366]">Paneles y moldes asignados por fachada</p>

        <div className="flex gap-2 overflow-x-auto py-3">
          {FACADE_FILTERS.map((f) => (
            <Chip
              key={f.key}
              testId={`report-facade-${f.key}`}
              selected={facade === f.key}
              color="#007AFF"
              icon={f.key !== "all" ? <Compass size={13} color={facade === f.key ? "#FFFFFF" : "#007AFF"} /> : null}
              label={f.label}
              onClick={() => setFacade(f.key)}
            />
          ))}
        </div>

        {!!error && (
          <p className="py-2 text-[13px] text-[#FF3B30]" data-testid="report-error">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16" data-testid="report-loading">
            <Loader2 size={32} className="animate-spin text-[#1C1C1E]" />
          </div>
        ) : (
          data && (
            <>
              <div className="mb-3 flex flex-col gap-2 rounded-xl bg-[#F2F2F7] p-3" data-testid="report-summary">
                <p className="text-sm font-bold text-[#111111]">
                  {data.total.toLocaleString("es-ES")} paneles &nbsp;·&nbsp; {data.con_molde.toLocaleString("es-ES")} con
                  molde &nbsp;·&nbsp; {data.sin_molde.toLocaleString("es-ES")} sin molde
                </p>
                {data.resumen.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.resumen.map((r) => (
                      <span
                        key={r.molde}
                        data-testid={`report-mold-count-${r.molde}`}
                        className="flex h-[26px] items-center gap-1.5 rounded-full bg-white px-2.5 text-xs font-semibold text-[#3A3A3C]"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color || NO_MOLDE_COLOR }} />
                        {r.molde} ({tipoLabel(r.tipo)}): {r.count}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-0.5 flex gap-2">
                  <button
                    data-testid="export-pdf-button"
                    onClick={() => exportReport("pdf")}
                    disabled={!!exporting}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#C0392B] text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-70"
                  >
                    {exporting === "pdf" ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                    Exportar PDF
                  </button>
                  <button
                    data-testid="export-excel-button"
                    onClick={() => exportReport("xlsx")}
                    disabled={!!exporting}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1E7145] text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-70"
                  >
                    {exporting === "xlsx" ? <Loader2 size={15} className="animate-spin" /> : <Grid3X3 size={15} />}
                    Exportar Excel
                  </button>
                </div>
              </div>

              <div data-testid="report-list">
                {(data.items || []).length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12" data-testid="report-empty">
                    <Layers size={36} className="text-[#C7C7CC]" />
                    <p className="text-[15px] font-bold text-[#111111]">Sin paneles en esta fachada</p>
                  </div>
                ) : (
                  data.items.map((item) => (
                    <div
                      key={item.name}
                      data-testid={`report-row-${item.name}`}
                      className="flex min-h-[56px] items-center gap-3 border-b border-[#E5E5EA] px-1 py-3"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-[#C7C7CC]"
                        style={{ backgroundColor: item.color || NO_MOLDE_COLOR }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#111111]">{displayName(item.name)}</p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-[#8E8E93]">
                          {item.facade && FACADE_LABELS[item.facade] ? FACADE_LABELS[item.facade] : "—"}
                          {"  ·  "}
                          {item.molde ? `${item.molde} · ${tipoLabel(item.tipo)}` : "Sin molde"}
                          {item.ancho && item.alto ? `  ·  ${item.ancho}×${item.alto} m` : ""}
                          {item.color_pintura ? `  ·  ${item.color_pintura}` : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}

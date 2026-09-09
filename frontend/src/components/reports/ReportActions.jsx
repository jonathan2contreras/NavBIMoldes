import React, { useState } from "react";
import { FileText, Grid3X3, Loader2, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { BACKEND_URL } from "../../lib/api";

export const ReportActions = ({ filters, disabled, fetching, refresh, updated }) => {
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");
  const download = async (format) => {
    setExporting(format);
    setError("");
    try {
      const query = new URLSearchParams({ ...filters, format });
      const response = await fetch(`${BACKEND_URL}/api/report/molds/export?${query}`);
      if (!response.ok) throw new Error("Export failed");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `reporte_moldes_${filters.facade}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("No se pudo exportar el reporte. Inténtalo de nuevo.");
    } finally { setExporting(""); }
  };
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" className="h-10 text-[#B63229]" disabled={disabled || !!exporting} data-testid="export-pdf-button" onClick={() => download("pdf")}>
          {exporting === "pdf" ? <Loader2 className="animate-spin" /> : <FileText />} PDF
        </Button>
        <Button variant="outline" className="h-10 text-[#1E7145]" disabled={disabled || !!exporting} data-testid="export-excel-button" onClick={() => download("xlsx")}>
          {exporting === "xlsx" ? <Loader2 className="animate-spin" /> : <Grid3X3 />} Excel
        </Button>
        <Button variant="secondary" size="icon" className="h-10 w-10" disabled={fetching} data-testid="report-refresh-button" onClick={refresh} aria-label="Actualizar reportes" title="Actualizar reportes">
          <RefreshCw className={fetching ? "animate-spin" : ""} />
        </Button>
      </div>
      {updated && <p className="text-xs text-[#636366]" data-testid="report-updated-at">Actualizado {updated.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>}
      {error && <p role="alert" className="max-w-xs text-xs text-red-700" data-testid="report-export-error">{error}</p>}
    </div>
  );
};
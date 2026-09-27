import React, { useState } from "react";
import { FileText } from "lucide-react";
import { BACKEND_URL } from "../../lib/api";

export default function AnalysisExport({ analysis, disabled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const download = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${BACKEND_URL}/api/reports/analysis.pdf`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totals: analysis.totals, total: analysis.total,
          groups: analysis.groups.map((group) => ({
            week: group.week, front: group.front, color: group.color, total: group.total, counts: group.counts,
          })),
          issues: analysis.issues.map((item) => ({
            code: item.code, mold: item.mold, front: item.front, week: item.week,
            date: item.date, status: item.status, delay: item.delay,
          })),
        }),
      });
      if (!response.ok) throw new Error("No se pudo exportar el análisis. Inténtalo de nuevo.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `analisis_cumplimiento_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" onClick={download} disabled={disabled || busy}
      className="inline-flex items-center gap-2 rounded-lg border border-[#C7C7CC] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
      data-testid="progress-export-pdf" title="Exportar el análisis en PDF">
      <FileText size={16} /> {busy ? "Generando PDF…" : "PDF"}
    </button>
    {error && <span role="alert" className="text-xs text-red-700" data-testid="progress-export-error">{error}</span>}
  </div>;
}

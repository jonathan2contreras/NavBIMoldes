import React, { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { BACKEND_URL } from "../../lib/api";
import { Button } from "../ui/button";

export default function ReadinessExport({ readiness, disabled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const download = async () => {
    setBusy(true); setError("");
    try {
      const { rows, pending, start } = readiness;
      const finish = rows.reduce((max, row) => (row.last > max ? row.last : max), rows[0]?.last || null);
      const response = await fetch(`${BACKEND_URL}/api/reports/mold-readiness.pdf`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: start, finish_date: finish,
          rows: rows.map((row) => ({
            name: row.name, tipo: row.mold?.tipo || null, color: row.mold?.color || null,
            copies: row.mold?.copies || 1,
            first: row.first, last: row.last, days: row.dayCount, panels: row.panels,
            total: row.mold?.total ?? row.panels, area: Math.round((row.area || 0) * 100) / 100,
          })),
          pending: pending.map((mold) => ({ name: mold.name, tipo: mold.tipo || null })),
        }),
      });
      if (!response.ok) throw new Error("No se pudo exportar los plazos. Inténtalo de nuevo.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `plazos_moldes_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return <div className="flex flex-wrap items-center gap-2">
    <Button variant="outline" className="h-10 text-[#B63229]" disabled={disabled || busy || !readiness.rows.length}
      onClick={download} data-testid="mold-readiness-export-pdf" title="Exportar plazos de moldes en PDF">
      {busy ? <Loader2 className="animate-spin" /> : <FileText />} PDF
    </Button>
    {error && <span role="alert" className="text-xs text-red-700" data-testid="mold-readiness-export-error">{error}</span>}
  </div>;
}

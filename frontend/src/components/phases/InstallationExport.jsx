import React, { useState } from "react";
import { GanttChart } from "lucide-react";
import { BACKEND_URL } from "../../lib/api";
import { Button } from "../ui/button";
import { captureFacades } from "./captureFacades";

export default function InstallationExport({ disabled }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const download = async () => {
    setPending(true); setError(""); setDone(false);
    try {
      const images = await captureFacades();
      const response = await fetch(`${BACKEND_URL}/api/phases/export-gantt.pdf`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images }),
      });
      if (!response.ok) throw new Error("No se pudo exportar el Gantt. Inténtalo de nuevo.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `gantt_instalacion_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDone(true);
    } catch (e) { setError(e.message); }
    finally { setPending(false); }
  };

  return <div className="flex flex-wrap items-center gap-2">
    <Button variant="outline" size="sm" disabled={disabled || pending} onClick={download} data-testid="installation-export-gantt">
      <GanttChart /> {pending ? "Generando PDF…" : "Gantt PDF"}
    </Button>
    {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    {done && <span role="status" className="text-xs text-green-700" data-testid="installation-export-success">PDF generado</span>}
  </div>;
}

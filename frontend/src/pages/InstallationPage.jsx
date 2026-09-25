import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useRole } from "../context/RoleContext";
import { weekMonday } from "../lib/phases";
import InstallationGantt from "../components/phases/InstallationGantt";
import InstallationExport from "../components/phases/InstallationExport";
import ViewerPage from "./ViewerPage";

export default function InstallationPage() {
  const { isAdmin } = useRole();
  const [plan, setPlan] = useState(null);
  const [selection, setSelection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = () => { setError(""); api.getPhases().then(setPlan).catch((e) => setError(e.message)); };
  useEffect(() => { load(); }, []);

  const move = async (source, date) => {
    if (!isAdmin || busy || !date) return;
    const newWeek = weekMonday(date);
    if (source.week === newWeek) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await api.movePhaseWeek({ ...source, new_week: newWeek });
      setPlan(updated);
      setSelection({ front_id: source.front_id, week: newWeek });
      setNotice("Semana guardada. El cronograma de fabricación no se ha recalculado.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#F2F2F7]" data-testid="installation-page">
      <section className="space-y-3 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Cronograma de instalación</h1>
          <InstallationExport disabled={!plan || busy} />
        </div>
        <p className="text-sm text-[#636366]">Selecciona una semana para resaltar sus paneles en el modelo, sin ocultar los demás. Este plan es independiente del cronograma de fabricación.</p>
        {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error} <button className="underline" onClick={load} disabled={busy}>Actualizar plan</button></div>}
        {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
        {!plan ? <p>Cargando plan de instalación…</p> : <InstallationGantt plan={plan} admin={isAdmin} selection={selection} onSelect={setSelection} onMove={move} busy={busy} />}
      </section>
      {plan && <section aria-label="Modelo del plan de instalación" className="h-[600px] min-h-[400px] border-t border-[#D4D4D4]">
        <ViewerPage installationSelection={selection} installationPlan={plan} compact />
      </section>}
    </div>
  );
}

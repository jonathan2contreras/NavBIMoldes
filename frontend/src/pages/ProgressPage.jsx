import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { analyzeSchedule } from "../lib/scheduleAnalysis";
import { weekLabel } from "../lib/phases";
import { dateLabel } from "../components/schedule/dates";

const segments = [
  { key: "advance", label: "Antes de la semana", color: "bg-emerald-600" },
  { key: "week", label: "Durante la semana", color: "bg-blue-500" },
  { key: "late", label: "Después del sábado", color: "bg-rose-500" },
  { key: "unscheduled", label: "Sin fecha de fabricación", color: "bg-amber-500" },
];

function Metric({ label, value, detail, icon: Icon, color }) {
  return <div className="rounded-2xl border border-[#E5E5EA] bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-[#636366]">{label}</p><Icon size={18} className={color} /></div>
    <p className="mt-3 text-3xl font-bold tabular-nums text-[#1C1C1E]" >{value}</p>
    <p className="mt-1 text-xs text-[#636366]">{detail}</p>
  </div>;
}

export default function ProgressPage() {
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [plan, schedule] = await Promise.all([api.getPhases(), api.getSchedule()]);
      setSource({ plan, schedule });
    } catch (err) { setSource(null); setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const analysis = source && analyzeSchedule(source.plan, source.schedule);
  const atRisk = analysis ? analysis.totals.late + analysis.totals.unscheduled : 0;
  const affectedWeeks = analysis?.groups.filter((group) => group.counts.late + group.counts.unscheduled > 0).length || 0;

  return <div className="h-full overflow-y-auto bg-[#F6F7F9] text-[#1C1C1E]" data-testid="progress-page">
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-7 sm:px-8">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#636366]">Fabricación / Instalación</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Análisis de cumplimiento</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#636366]">Comparación de las fechas previstas de fabricación con la semana asignada para instalación de cada panel.</p></div>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[#C7C7CC] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50" data-testid="progress-refresh"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Actualizar datos</button>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">No se pudo cargar el análisis: {error}</p>}
      {loading && <p role="status" className="py-12 text-center text-sm text-[#636366]">Cargando cronogramas…</p>}
      {analysis && !loading && <>
        {!source.schedule.saved && <p role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">El cronograma de fabricación aún no está guardado: esta comparación usa una propuesta inicial.</p>}
        {source.schedule.needs_replan && <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">El plan de instalación cambió o el cronograma requiere recálculo. Revisa <Link to="/schedule" className="font-semibold underline">Fabricación</Link> para actualizar las fechas previstas.</p>}
        {!analysis.total ? <div className="rounded-2xl border bg-white p-8 text-center"><p className="font-semibold">Aún no hay paneles asignados a instalación.</p><Link to="/installation" className="mt-2 inline-block text-sm text-blue-700 underline">Ver plan de instalación</Link></div> : <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Paneles en el plan" value={analysis.total} detail="Con frente y semana asignados" icon={CalendarClock} color="text-[#636366]" />
            <Metric label="Fabricados antes" value={analysis.totals.advance} detail="Previstos antes del lunes" icon={CheckCircle2} color="text-emerald-600" />
            <Metric label="En su semana" value={analysis.totals.week} detail="Previstos de lunes a sábado" icon={Clock3} color="text-blue-600" />
            <Metric label="En riesgo" value={atRisk} detail={`${analysis.totals.late} posteriores · ${analysis.totals.unscheduled} sin fecha`} icon={AlertTriangle} color="text-rose-600" />
          </div>
          <section className={`mt-6 rounded-2xl border p-5 sm:p-6 ${atRisk ? "border-rose-200 bg-rose-50/70" : "border-emerald-200 bg-emerald-50/70"}`} data-testid="progress-assessment">
            <p className="text-xs font-bold uppercase tracking-widest text-[#636366]">Lectura del plan</p>
            <h2 className="mt-2 text-xl font-bold">{atRisk ? `${atRisk} paneles requieren atención en ${affectedWeeks} semanas de instalación` : "Sin atrasos previstos frente al plan de instalación"}</h2>
            <p className="mt-2 text-sm leading-6 text-[#3A3A3C]">{analysis.totals.late ? `${analysis.totals.late} paneles tienen fabricación prevista después del sábado de su semana de instalación. ` : ""}{analysis.totals.unscheduled ? `${analysis.totals.unscheduled} paneles asignados no tienen fecha de fabricación; confirma su molde y recalcula el cronograma. ` : ""}{analysis.totals.week ? `${analysis.totals.week} paneles se fabrican durante la misma semana y dejan poco margen para traslado y montaje. ` : ""}{!atRisk && !analysis.totals.week ? "Todos los paneles asignados se fabrican antes de su semana de instalación. " : ""}Este análisis compara fechas programadas, no avance real de obra.</p>
          </section>
          <section className="mt-8" aria-label="Comparación por semana y frente">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Semanas y frentes</h2><p className="mt-1 text-sm text-[#636366]">Distribución de paneles según su fecha de fabricación prevista.</p></div><div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#636366]">{segments.map((s) => <span key={s.key} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${s.color}`} />{s.label}</span>)}</div></div>
            <div className="overflow-x-auto rounded-2xl border border-[#E5E5EA] bg-white"><table className="w-full min-w-[660px] text-left text-sm"><thead className="border-b bg-[#FAFAFA] text-xs text-[#636366]"><tr><th className="px-5 py-3">Semana de instalación</th><th className="px-5 py-3">Frente</th><th className="px-5 py-3">Paneles</th><th className="w-1/2 px-5 py-3">Situación</th><th className="px-5 py-3 text-right">Riesgo</th></tr></thead><tbody>{analysis.groups.map((group) => <tr key={group.key} className="border-t border-[#F2F2F7]" data-testid="progress-week-row"><td className="whitespace-nowrap px-5 py-4 font-semibold">{weekLabel(group.week)}</td><td className="px-5 py-4"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color }} />{group.front}</td><td className="px-5 py-4 tabular-nums">{group.total}</td><td className="px-5 py-4"><div className="flex h-3 overflow-hidden rounded-full bg-[#F2F2F7]" aria-label={`${group.counts.advance} antes, ${group.counts.week} en semana, ${group.counts.late} tarde, ${group.counts.unscheduled} sin fecha`}>{segments.map((s) => group.counts[s.key] > 0 && <div key={s.key} className={s.color} style={{ width: `${group.counts[s.key] / group.total * 100}%` }} />)}</div><p className="mt-1 text-xs text-[#636366]">{group.counts.advance} antes · {group.counts.week} en semana · {group.counts.late} tarde · {group.counts.unscheduled} sin fecha</p></td><td className="px-5 py-4 text-right font-bold tabular-nums">{group.counts.late + group.counts.unscheduled || "—"}</td></tr>)}</tbody></table></div>
          </section>
          {analysis.issues.length > 0 && <section className="mt-8" aria-label="Paneles que requieren atención"><h2 className="text-xl font-bold">Paneles que requieren atención</h2><p className="mt-1 text-sm text-[#636366]">Prioridad por semana de instalación; los retrasos se miden desde el sábado de esa semana.</p><div className="mt-4 max-h-[420px] overflow-auto rounded-2xl border border-[#E5E5EA] bg-white"><table className="w-full min-w-[680px] text-left text-sm"><thead className="sticky top-0 bg-[#FAFAFA] text-xs text-[#636366]"><tr><th className="px-5 py-3">Panel</th><th className="px-5 py-3">Frente / instalación</th><th className="px-5 py-3">Fabricación</th><th className="px-5 py-3">Diagnóstico</th></tr></thead><tbody>{analysis.issues.map((item, index) => <tr key={`${item.object_name}-${index}`} className="border-t border-[#F2F2F7]"><td className="px-5 py-3 font-semibold">{item.code}<p className="text-xs font-normal text-[#636366]">{item.mold}</p></td><td className="px-5 py-3">{item.front}<p className="text-xs text-[#636366]">{weekLabel(item.week)}</p></td><td className="px-5 py-3">{dateLabel(item.date)}</td><td className="px-5 py-3 font-semibold text-rose-700">{item.status === "unscheduled" ? "Sin fecha" : `${item.delay} ${item.delay === 1 ? "día" : "días"} después del sábado`}</td></tr>)}</tbody></table></div></section>}
          <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold"><Link to="/schedule" className="inline-flex items-center gap-1 text-blue-700">Ver fabricación <ArrowRight size={15} /></Link><Link to="/installation" className="inline-flex items-center gap-1 text-blue-700">Ver instalación <ArrowRight size={15} /></Link></div>
        </>}
      </>}
    </div>
  </div>;
}

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Factory, FileText, Loader2, LogOut, Minus, TrendingDown, TrendingUp } from "lucide-react";

import { api } from "../lib/api";
import { useRole } from "../context/RoleContext";
import { LOGOS, NO_STATUS_COLOR, STATUSES } from "../lib/theme";

const FACADE_ORDER = [
  { key: "norte", label: "Norte" },
  { key: "sur", label: "Sur" },
  { key: "este", label: "Este" },
  { key: "oeste", label: "Oeste" },
];

const pctLabelOf = (raw) => (raw > 0 && raw < 1 ? "<1%" : `${Math.round(raw)}%`);

export default function ProgressPage() {
  const navigate = useNavigate();
  const { role, logout } = useRole();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setError(false);
      setStats(await api.getStats());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const pctRaw = stats && stats.total > 0 ? (stats.etiquetados / stats.total) * 100 : 0;

  return (
    <div className="h-full overflow-y-auto bg-white" data-testid="progress-screen">
      <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-4">
        <div className="flex items-center justify-between pb-2">
          <div>
            <h1 className="text-2xl font-extrabold text-[#111111]">Progreso</h1>
            <p className="mt-0.5 text-[11px] font-semibold text-[#8E8E93]" data-testid="current-role-label">
              {role === "admin" ? "Administrador" : "Usuario (solo lectura)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="reports-button"
              onClick={() => navigate("/reports")}
              className="flex h-9 items-center gap-1.5 rounded-full bg-[#1C1C1E] px-3.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
            >
              <FileText size={15} /> Reportes
            </button>
            <button
              data-testid="logout-button"
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2F7] transition-opacity hover:opacity-70"
            >
              <LogOut size={18} className="text-[#636366]" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center" data-testid="progress-loading">
            <Loader2 size={32} className="animate-spin text-[#1C1C1E]" />
          </div>
        ) : error || !stats ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4" data-testid="progress-error">
            <p className="text-sm text-[#8E8E93]">Error al calcular estadísticas</p>
            <button
              data-testid="progress-retry-button"
              onClick={() => {
                setLoading(true);
                fetchStats();
              }}
              className="h-11 rounded-xl bg-[#1C1C1E] px-6 text-sm font-bold text-white"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white" data-testid="progress-hero">
              <div className="flex items-center">
                <div className="flex-1 p-6">
                  <p className="text-[11px] font-bold tracking-widest text-[#8E8E93]">AVANCE DE FACHADA</p>
                  <p className="mt-1 text-5xl font-extrabold text-[#111111]" data-testid="progress-overall-pct">
                    {pctLabelOf(pctRaw)}
                  </p>
                  <p className="mt-0.5 text-[13px] text-[#636366]">
                    {stats.etiquetados.toLocaleString("es-ES")} de {stats.total.toLocaleString("es-ES")} paneles de
                    fachada etiquetados
                  </p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#E5E5EA]">
                    <div
                      className="h-full rounded-full bg-[#1C1C1E]"
                      style={{ width: `${Math.max(pctRaw, stats.etiquetados > 0 ? 1.5 : 0)}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center gap-3 pr-5" data-testid="progress-logos">
                  {LOGOS.map((l) => (
                    <img
                      key={l.key}
                      src={l.src}
                      alt={l.key}
                      data-testid={`logo-${l.key}`}
                      className="h-[38px] object-contain"
                      style={{ aspectRatio: l.ratio }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {!!stats.semana && (
              <div className="rounded-xl bg-[#F2F2F7] p-4" data-testid="progress-weekly-summary">
                <div className="mb-3 flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-[#636366]" />
                  <p className="text-[11px] font-bold tracking-widest text-[#636366]">INSTALACIONES SEMANALES</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 rounded-lg bg-white p-3">
                    <p className="text-[11px] font-semibold text-[#8E8E93]">Esta semana</p>
                    <p className="mt-1 text-[28px] font-extrabold text-[#34C759]" data-testid="weekly-current-count">
                      {stats.semana.actual}
                    </p>
                    <p className="text-[11px] text-[#8E8E93]">paneles instalados</p>
                  </div>
                  <div className="flex flex-col items-center gap-1" data-testid="weekly-delta">
                    {stats.semana.actual > stats.semana.anterior ? (
                      <TrendingUp size={22} className="text-[#34C759]" />
                    ) : stats.semana.actual < stats.semana.anterior ? (
                      <TrendingDown size={22} className="text-[#FF3B30]" />
                    ) : (
                      <Minus size={22} className="text-[#8E8E93]" />
                    )}
                    <span
                      className="text-xs font-bold"
                      style={{
                        color:
                          stats.semana.actual > stats.semana.anterior
                            ? "#34C759"
                            : stats.semana.actual < stats.semana.anterior
                              ? "#FF3B30"
                              : "#8E8E93",
                      }}
                    >
                      {stats.semana.actual - stats.semana.anterior > 0 ? "+" : ""}
                      {stats.semana.actual - stats.semana.anterior}
                    </span>
                  </div>
                  <div className="flex-1 rounded-lg bg-white p-3">
                    <p className="text-[11px] font-semibold text-[#8E8E93]">Semana anterior</p>
                    <p className="mt-1 text-[28px] font-extrabold text-[#6E6E73]" data-testid="weekly-previous-count">
                      {stats.semana.anterior}
                    </p>
                    <p className="text-[11px] text-[#8E8E93]">paneles instalados</p>
                  </div>
                </div>
              </div>
            )}

            {!!stats.por_fachada && (
              <div className="rounded-xl bg-[#F2F2F7] p-4" data-testid="progress-facade-breakdown">
                <div className="mb-2 flex items-center gap-1.5">
                  <Compass size={15} className="text-[#636366]" />
                  <p className="text-[11px] font-bold tracking-widest text-[#636366]">AVANCE POR FACHADA</p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {FACADE_ORDER.map((f) => {
                    const d = stats.por_fachada?.[f.key] || { total: 0, etiquetados: 0 };
                    const pRaw = d.total > 0 ? (d.etiquetados / d.total) * 100 : 0;
                    return (
                      <div key={f.key} className="flex items-center gap-2" data-testid={`facade-bar-${f.key}`}>
                        <span className="w-12 text-[13px] font-semibold text-[#111111]">{f.label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E5E5EA]">
                          <div
                            className="h-full rounded-full bg-[#007AFF]"
                            style={{ width: `${Math.max(pRaw, d.etiquetados > 0 ? 1.5 : 0)}%` }}
                          />
                        </div>
                        <span className="min-w-[78px] text-right text-xs font-semibold text-[#636366]">
                          {d.etiquetados}/{d.total} · {pctLabelOf(pRaw)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {STATUSES.map((s) => {
                const count = stats.counts[s.key] || 0;
                const pRaw = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={s.key} className="rounded-xl bg-[#F2F2F7] p-4" data-testid={`progress-card-${s.key}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.accent }} />
                      <span className="text-[13px] font-semibold text-[#3A3A3C]">{s.label}</span>
                    </div>
                    <p className="mt-2 text-[28px] font-extrabold" style={{ color: s.accent }}>
                      {count.toLocaleString("es-ES")}
                    </p>
                    <p className="mt-0.5 text-xs text-[#8E8E93]">{pctLabelOf(pRaw)} de la fachada</p>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#E5E5EA]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(pRaw, count > 0 ? 1.5 : 0)}%`,
                          backgroundColor: s.accent,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {(() => {
                const sinRaw = stats.total > 0 ? (stats.sin_estado / stats.total) * 100 : 0;
                return (
                  <div className="rounded-xl bg-[#F2F2F7] p-4" data-testid="progress-card-sin-estado">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NO_STATUS_COLOR }} />
                      <span className="text-[13px] font-semibold text-[#3A3A3C]">Sin estado</span>
                    </div>
                    <p className="mt-2 text-[28px] font-extrabold text-[#6E6E73]">
                      {stats.sin_estado.toLocaleString("es-ES")}
                    </p>
                    <p className="mt-0.5 text-xs text-[#8E8E93]">{pctLabelOf(sinRaw)} de la fachada</p>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#E5E5EA]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(sinRaw, stats.sin_estado > 0 ? 1.5 : 0)}%`,
                          backgroundColor: NO_STATUS_COLOR,
                        }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {(() => {
              const c = stats.counts || {};
              const fabricadoAcum = (c.fabricado || 0) + (c.enviado || 0) + (c.instalado || 0);
              const instaladoAcum = c.instalado || 0;
              const gap = fabricadoAcum - instaladoAcum;
              const base = Math.max(fabricadoAcum, instaladoAcum, 1);
              const fabPct = (fabricadoAcum / base) * 100;
              const instPct = (instaladoAcum / base) * 100;
              const adelantados = gap > 0;
              return (
                <div className="rounded-xl bg-[#F2F2F7] p-4" data-testid="progress-fab-vs-inst">
                  <div className="mb-3 flex items-center gap-1.5">
                    <Factory size={15} className="text-[#636366]" />
                    <p className="text-[11px] font-bold tracking-widest text-[#636366]">FABRICACIÓN VS INSTALACIÓN</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div data-testid="fab-vs-inst-bar-fabricado">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#007AFF" }} />
                          <span className="text-[13px] font-semibold text-[#3A3A3C]">Fabricado</span>
                        </div>
                        <span className="text-[13px] font-bold text-[#007AFF]">
                          {fabricadoAcum.toLocaleString("es-ES")}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#E5E5EA]">
                        <div
                          className="h-full rounded-full bg-[#007AFF] transition-all"
                          style={{ width: `${Math.max(fabPct, fabricadoAcum > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                    </div>

                    <div data-testid="fab-vs-inst-bar-instalado">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#34C759" }} />
                          <span className="text-[13px] font-semibold text-[#3A3A3C]">Instalado</span>
                        </div>
                        <span className="text-[13px] font-bold text-[#34C759]">
                          {instaladoAcum.toLocaleString("es-ES")}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#E5E5EA]">
                        <div
                          className="h-full rounded-full bg-[#34C759] transition-all"
                          style={{ width: `${Math.max(instPct, instaladoAcum > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    className="mt-4 flex items-center gap-3 rounded-lg bg-white p-3"
                    data-testid="fab-vs-inst-summary"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: adelantados ? "#E8F8EE" : "#F2F2F7" }}
                    >
                      {adelantados ? (
                        <TrendingUp size={20} className="text-[#34C759]" />
                      ) : (
                        <Minus size={20} className="text-[#8E8E93]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className="text-[15px] font-extrabold"
                        style={{ color: adelantados ? "#34C759" : "#8E8E93" }}
                        data-testid="fab-vs-inst-delta"
                      >
                        {gap > 0 ? "+" : ""}
                        {gap.toLocaleString("es-ES")} paneles
                      </p>
                      <p className="mt-0.5 text-[12px] leading-snug text-[#636366]" data-testid="fab-vs-inst-message">
                        {adelantados
                          ? `Vamos adelantados en fabricación: hay ${gap.toLocaleString(
                              "es-ES",
                            )} paneles fabricados esperando instalación.`
                          : "La instalación está al día con la fabricación: no hay colchón de paneles pendientes."}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

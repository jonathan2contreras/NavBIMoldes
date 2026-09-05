import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, Hand, Loader2, MousePointerClick, Plus, Tag, X } from "lucide-react";

import { api, VIEWER_URL } from "../lib/api";
import { TagSheet } from "../components/TagSheet";
import { BulkTagModal } from "../components/BulkTagModal";
import { useRole } from "../context/RoleContext";
import { FACADE_LABELS, LOGOS, NO_MOLDE_COLOR, displayName } from "../lib/theme";

export default function ViewerPage() {
  const { isAdmin } = useRole();
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [hintVisible, setHintVisible] = useState(true);
  const [viewerKey, setViewerKey] = useState(0);
  const [isoFilter, setIsoFilter] = useState("all");
  const [focusedName, setFocusedName] = useState(null);
  const [sheetObj, setSheetObj] = useState(null);
  const [molds, setMolds] = useState([]);
  const [report, setReport] = useState(null);
  const [multiMode, setMultiMode] = useState(false);
  const [multiNames, setMultiNames] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [facadeLoading, setFacadeLoading] = useState(null);
  const loadedRef = useRef(false);
  const pendingFocusRef = useRef(null);
  const [searchParams] = useSearchParams();
  const focus = searchParams.get("focus");
  const t = searchParams.get("t");

  const counts = {};
  (report?.resumen || []).forEach((r) => (counts[r.molde] = r.count));

  const ISO_FILTERS = [
    { key: "all", label: `Todas${report ? ` (${report.total})` : ""}` },
    ...molds.map((m) => ({
      key: m.name,
      label: `${m.name}${report ? ` (${counts[m.name] || 0})` : ""}`,
      color: m.color,
      accent: m.color,
      textOn: "#FFFFFF",
    })),
    {
      key: "none",
      label: `Sin molde${report ? ` (${report.sin_molde})` : ""}`,
      color: NO_MOLDE_COLOR,
      accent: NO_MOLDE_COLOR,
      textOn: "#FFFFFF",
    },
  ];

  const refreshCounts = useCallback(() => {
    api
      .getMoldsReport("all")
      .then(setReport)
      .catch(() => {});
  }, []);

  useEffect(() => {
    api
      .getMolds()
      .then((r) => setMolds(r.items || []))
      .catch(() => {});
    refreshCounts();
  }, [refreshCounts]);

  const sendCmd = useCallback((cmd, args = []) => {
    const payload = JSON.stringify({ __viewerCmd: true, cmd, args });
    iframeRef.current?.contentWindow?.postMessage(payload, "*");
  }, []);

  useEffect(() => {
    if (!focus) return;
    setHintVisible(false);
    setFocusedName(focus);
    if (loadedRef.current) sendCmd("focusObject", [focus]);
    else pendingFocusRef.current = focus;
  }, [focus, t, sendCmd]);

  const loadTags = useCallback(async () => {
    try {
      const tags = await api.getTags();
      const map = {};
      for (const [name, tg] of Object.entries(tags)) {
        if (tg.molde) map[name] = { molde: tg.molde, color: tg.color_molde };
      }
      sendCmd("applyTags", [map]);
    } catch {}
  }, [sendCmd]);

  const openObject = useCallback((name) => {
    api
      .getObject(name)
      .then(setSheetObj)
      .catch(() => setSheetObj({ name, mark: name.split(" ")[0], status: null, observation: "" }));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (typeof e.data !== "string") return;
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!msg || !msg.type) return;
      if (msg.type === "progress") setProgress(msg.pct);
      else if (msg.type === "loaded") {
        setLoading(false);
        loadedRef.current = true;
        loadTags();
        if (pendingFocusRef.current) {
          const f = pendingFocusRef.current;
          pendingFocusRef.current = null;
          sendCmd("focusObject", [f]);
        }
      } else if (msg.type === "error") {
        setLoading(false);
        setError(msg.message || "Error al cargar el modelo");
      } else if (msg.type === "select") {
        setHintVisible(false);
        openObject(msg.name);
      } else if (msg.type === "multiselect") {
        setMultiNames(msg.names || []);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [loadTags, sendCmd, openObject]);

  const handleIsolate = (key) => {
    setIsoFilter((prev) => {
      const next = prev === key ? "all" : key;
      sendCmd("isolate", [next]);
      return next;
    });
  };

  const handleSaved = useCallback(
    (obj) => {
      sendCmd("setTag", [obj.name, obj.molde ? { molde: obj.molde, color: obj.color_molde } : null]);
      refreshCounts();
    },
    [sendCmd, refreshCounts]
  );

  const closeSheet = useCallback(() => {
    setSheetObj(null);
    if (!focusedName) sendCmd("clearSelection");
  }, [sendCmd, focusedName]);

  const closeFocused = () => {
    setFocusedName(null);
    sendCmd("clearSelection");
  };

  const toggleMultiMode = () => {
    const next = !multiMode;
    setMultiMode(next);
    setMultiNames([]);
    setSheetObj(null);
    setFocusedName(null);
    setHintVisible(false);
    sendCmd("setMultiMode", [next]);
  };

  const clearMultiSelection = () => {
    setMultiNames([]);
    sendCmd("clearMultiSelection");
  };

  const selectFacade = useCallback(
    async (facade) => {
      setFacadeLoading(facade);
      try {
        const r = await api.getObjectNames(facade, "all");
        sendCmd("selectNames", [r.names || [], true]);
      } catch {
        // no-op
      } finally {
        setFacadeLoading(null);
      }
    },
    [sendCmd]
  );

  const handleBulkApplied = useCallback(() => {    loadTags();
    refreshCounts();
    setMultiNames([]);
    sendCmd("clearMultiSelection");
  }, [loadTags, refreshCounts, sendCmd]);

  const retry = () => {
    setError("");
    setLoading(true);
    setProgress(0);
    loadedRef.current = false;
    setViewerKey((k) => k + 1);
  };

  return (
    <div className="relative h-full w-full bg-[#EDEEF2]" data-testid="viewer-screen">
      <iframe
        key={viewerKey}
        ref={iframeRef}
        src={VIEWER_URL}
        title="Visor 3D"
        className="block h-full w-full border-0"
        data-testid="model-viewer-iframe"
      />

      <div className="pointer-events-none absolute left-4 right-4 top-3">
        <div className="pointer-events-auto rounded-2xl bg-white/55 px-4 py-3 backdrop-blur-xl">
          <div className="flex gap-2 overflow-x-auto pb-0.5" data-testid="mold-legend">
            {ISO_FILTERS.map((f) => {
              const selected = isoFilter === f.key;
              return (
                <button
                  key={f.key}
                  data-testid={`legend-${f.key}`}
                  onClick={() => handleIsolate(f.key)}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors"
                  style={
                    selected
                      ? {
                          backgroundColor: f.color || "#1C1C1E",
                          borderColor: f.color || "#1C1C1E",
                          color: f.textOn || "#FFFFFF",
                        }
                      : { backgroundColor: "rgba(255,255,255,0.7)", borderColor: "#C7C7CC", color: "#3A3A3C" }
                  }
                >
                  {!!f.color && !selected && (
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.accent || f.color }} />
                  )}
                  {f.label}
                </button>
              );
            })}
          </div>
          {isAdmin && (
            <div className="mt-2 flex items-center gap-2 border-t border-white/60 pt-2">
              <button
                data-testid="multi-select-toggle"
                onClick={toggleMultiMode}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors"
                style={
                  multiMode
                    ? { backgroundColor: "#1C1C1E", borderColor: "#1C1C1E", color: "#FFFFFF" }
                    : { backgroundColor: "rgba(255,255,255,0.7)", borderColor: "#C7C7CC", color: "#3A3A3C" }
                }
              >
                <MousePointerClick size={14} />
                {multiMode ? "Selección múltiple activa" : "Selección múltiple"}
              </button>
              {multiMode && (
                <span className="text-[11px] font-semibold text-[#3A3A3C]" data-testid="multi-select-hint">
                  Toca varios paneles para seleccionarlos
                </span>
              )}
              {multiMode && (
                <div className="flex items-center gap-1.5 overflow-x-auto pl-1" data-testid="facade-select-group">
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-[#8E8E93]">Fachada</span>
                  {Object.entries(FACADE_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      data-testid={`facade-select-${key}`}
                      onClick={() => selectFacade(key)}
                      disabled={facadeLoading === key}
                      className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-[#C7C7CC] bg-white/70 px-3 text-xs font-semibold text-[#3A3A3C] hover:bg-white disabled:opacity-60"
                    >
                      {facadeLoading === key ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!loading && !error && multiMode && multiNames.length > 0 && (
        <div className="absolute bottom-6 left-4 right-4 flex justify-center">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg" data-testid="multi-select-bar">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold tracking-wide text-[#8E8E93]">SELECCIÓN MÚLTIPLE</p>
              <p className="truncate text-[13px] font-bold text-[#111111]" data-testid="multi-select-count">
                {multiNames.length} {multiNames.length === 1 ? "pieza seleccionada" : "piezas seleccionadas"}
              </p>
            </div>
            <button
              data-testid="multi-select-tag-button"
              onClick={() => setBulkOpen(true)}
              className="flex h-[34px] items-center gap-1.5 rounded-full bg-[#1C1C1E] px-3 text-xs font-bold text-white"
            >
              <Tag size={14} /> Etiquetar
            </button>
            <button onClick={clearMultiSelection} data-testid="multi-select-clear-button">
              <X size={20} className="text-[#8E8E93]" />
            </button>
          </div>
        </div>
      )}

      {!loading && !error && focusedName && (
        <div className="absolute bottom-6 left-4 right-4 flex justify-center">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg" data-testid="focused-piece-banner">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold tracking-wide text-[#8E8E93]">PIEZA ENFOCADA</p>
              <p className="truncate text-[13px] font-bold text-[#111111]">{displayName(focusedName)}</p>
            </div>
            <button
              data-testid="focused-tag-button"
              onClick={() => openObject(focusedName)}
              className="flex h-[34px] items-center gap-1.5 rounded-full bg-[#1C1C1E] px-3 text-xs font-bold text-white"
            >
              <Tag size={14} /> Etiquetar
            </button>
            <button onClick={closeFocused} data-testid="focused-close-button">
              <X size={20} className="text-[#8E8E93]" />
            </button>
          </div>
        </div>
      )}

      {!loading && !error && hintVisible && !focusedName && !multiMode && (
        <div className="pointer-events-none absolute bottom-6 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-1.5 rounded-full bg-[#1C1C1E]/85 px-4 py-2.5" data-testid="tap-hint">
            <Hand size={14} className="text-white" />
            <span className="text-[13px] font-medium text-white">Toca una pieza para etiquetarla</span>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-white px-8 py-10" data-testid="viewer-loading">
          <div className="flex flex-col items-center justify-center gap-7" data-testid="viewer-loading-logos">
            {LOGOS.map((l) => (
              <img
                key={l.key}
                src={l.src}
                alt={l.key}
                data-testid={`viewer-loading-logo-${l.key}`}
                className="h-[70px] w-[230px] object-contain"
                style={{ aspectRatio: l.ratio }}
              />
            ))}
          </div>

          <div className="flex flex-col items-center">
            <Loader2 size={36} className="animate-spin text-[#1C1C1E]" />
            <p className="mt-4 text-base font-bold text-[#111111]">Cargando modelo BIM...</p>
            <p className="mt-1 text-[13px] text-[#8E8E93]">{progress > 0 ? `${progress}%` : "Conectando..."}</p>
            <div className="mt-4 h-1.5 w-4/5 max-w-md overflow-hidden rounded-full bg-[#E5E5EA]">
              <div className="h-full rounded-full bg-[#1C1C1E] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-xs text-[#8E8E93]">El modelo pesa 57 MB, puede tardar un momento</p>
          </div>
        </div>
      )}

      {!!error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white px-8" data-testid="viewer-error">
          <AlertCircle size={40} className="text-[#FF3B30]" />
          <p className="mt-4 text-base font-bold text-[#111111]">Error al cargar el modelo</p>
          <button
            data-testid="viewer-retry-button"
            onClick={retry}
            className="mt-4 h-11 rounded-xl bg-[#1C1C1E] px-6 text-sm font-bold text-white"
          >
            Reintentar
          </button>
        </div>
      )}

      {sheetObj && <TagSheet obj={sheetObj} onClose={closeSheet} onSaved={handleSaved} />}
      {bulkOpen && (
        <BulkTagModal objectNames={multiNames} onClose={() => setBulkOpen(false)} onApplied={handleBulkApplied} />
      )}
    </div>
  );
}

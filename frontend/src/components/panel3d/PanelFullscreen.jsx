import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ruler, X } from "lucide-react";

import { FACADE_LABELS, NO_MOLDE_COLOR, dimParts, displayName, tipoLabel } from "../../lib/theme";
import { usePanelScene } from "./usePanelScene";

export const PanelFullscreen = ({ obj, mesh, onClose }) => {
  const canvasRef = useRef(null);
  const measureRef = useRef(null);
  const [measuring, setMeasuring] = useState(false);
  const [result, setResult] = useState(null); // { mm } | { mm:null, started } | null

  // Scene units → millimetres. Sizes > 100 are already in mm, otherwise metres.
  const unitScale = useMemo(() => {
    const s = mesh?.size || [];
    const maxDim = Math.max(...s, 0);
    return maxDim > 100 ? 1 : 1000;
  }, [mesh]);

  const onMeasure = useCallback((r) => setResult(r), []);

  usePanelScene(canvasRef, mesh, { interactive: true, measureRef, unitScale, onMeasure });

  const toggleMeasure = useCallback(() => {
    setMeasuring((prev) => {
      const next = !prev;
      measureRef.current?.setMode(next);
      setResult(null);
      return next;
    });
  }, []);

  const clearMeasure = useCallback(() => {
    measureRef.current?.clear();
    setResult(null);
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const p = dimParts(obj.dimensions) || dimParts(mesh?.size);
  const facade = (obj.facade && FACADE_LABELS[obj.facade]) || "—";

  return (
    <div className="fixed inset-0 z-[60] bg-[#EDEEF2] animate-in fade-in duration-200" data-testid="panel-fullscreen">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" data-testid="panel-fullscreen-canvas" />

      <div className="pointer-events-none absolute left-6 top-5 right-20" data-testid="panel-fullscreen-info">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: obj.color_molde || NO_MOLDE_COLOR }}
            data-testid="panel-fullscreen-status-dot"
          />
          <p className="truncate text-2xl font-extrabold tracking-tight text-[#111111] sm:text-3xl" data-testid="panel-fullscreen-code">
            {displayName(obj.name)}
          </p>
        </div>
        <p className="mt-1 text-sm font-semibold text-[#636366]">
          <span data-testid="panel-fullscreen-facade">Fachada {facade}</span>
          {!!p && (
            <>
              {" · "}
              <span data-testid="panel-fullscreen-width">{p.w.toFixed(2)}</span> ×{" "}
              <span data-testid="panel-fullscreen-height">{p.h.toFixed(2)} m</span>
              {" · "}
              <span data-testid="panel-fullscreen-area">{(p.w * p.h).toFixed(2)} m²</span>
            </>
          )}
          {" · "}
          <span data-testid="panel-fullscreen-status">{obj.molde ? `${obj.molde} · ${tipoLabel(obj.tipo)}` : "Sin molde"}</span>
        </p>
      </div>

      {/* Measure toolbar */}
      <div className="absolute left-6 bottom-6 right-6 flex flex-col items-start gap-3" data-testid="panel-measure-toolbar">
        {measuring && (
          <div
            className="pointer-events-none rounded-xl bg-[#1C1C1E]/90 px-4 py-2.5 text-white shadow-lg backdrop-blur-sm"
            data-testid="panel-measure-panel"
          >
            {result?.mm != null ? (
              <div className="flex items-baseline gap-1.5">
                <Ruler size={16} className="translate-y-[2px] text-[#FF9F43]" />
                <span className="text-2xl font-extrabold tracking-tight" data-testid="panel-measure-result">
                  {Math.round(result.mm).toLocaleString("es-ES")}
                </span>
                <span className="text-sm font-semibold text-[#C7C7CC]">mm</span>
              </div>
            ) : (
              <p className="text-[13px] font-semibold text-[#E5E5EA]" data-testid="panel-measure-hint">
                {result?.started ? "Toca el segundo punto para medir" : "Toca dos puntos del panel para medir"}
              </p>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMeasure}
            data-testid="panel-measure-toggle"
            className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold shadow-lg transition-colors ${
              measuring ? "bg-[#FF3B30] text-white" : "bg-white text-[#111111] hover:bg-[#F2F2F7]"
            }`}
          >
            <Ruler size={17} />
            {measuring ? "Medición activa" : "Medir"}
          </button>
          {measuring && result && (
            <button
              onClick={clearMeasure}
              data-testid="panel-measure-clear"
              className="flex h-11 items-center rounded-full bg-[#1C1C1E] px-4 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-85"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onClose}
        data-testid="panel-fullscreen-close"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#1C1C1E] text-white shadow-lg transition-opacity hover:opacity-85"
      >
        <X size={20} />
      </button>
    </div>
  );
};

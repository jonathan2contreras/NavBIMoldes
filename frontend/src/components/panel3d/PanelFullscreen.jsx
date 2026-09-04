import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { FACADE_LABELS, NO_MOLDE_COLOR, dimParts, displayName, tipoLabel } from "../../lib/theme";
import { usePanelScene } from "./usePanelScene";

export const PanelFullscreen = ({ obj, mesh, onClose }) => {
  const canvasRef = useRef(null);
  usePanelScene(canvasRef, mesh, { interactive: true });

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

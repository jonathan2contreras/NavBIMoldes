import React from "react";
import { Loader2 } from "lucide-react";
import { LOGOS } from "../lib/theme";
import "./viewer-loading.css";

export const ViewerLoading = ({ progress }) => (
  <div className="viewer-loading-shell absolute inset-0 overflow-y-auto bg-white" data-testid="viewer-loading">
    <div className="viewer-loading-position flex w-full flex-col items-center px-6 py-4" style={{ height: "70%", justifyContent: "safe center" }} data-testid="viewer-loading-position">
      <div className="viewer-loading-content flex w-full shrink-0 flex-col items-center gap-6" data-testid="viewer-loading-content">
        <div className="viewer-loading-logos flex w-full max-w-[230px] flex-col items-center gap-4" data-testid="viewer-loading-logos">
          {LOGOS.map((logo) => <img key={logo.key} src={logo.src} alt={logo.key} data-testid={`viewer-loading-logo-${logo.key}`}
            className="block h-auto w-full object-contain" style={{ aspectRatio: logo.ratio }} />)}
        </div>
        <div className="flex w-full max-w-sm flex-col items-center text-center" data-testid="viewer-loading-progress-group">
          <Loader2 size={32} className="viewer-loading-spinner animate-spin text-[#1C1C1E]" />
          <p className="viewer-loading-title mt-4 text-base font-bold text-[#111111]" data-testid="viewer-loading-title">Cargando modelo BIM...</p>
          <p className="mt-1 text-[13px] text-[#8E8E93]" data-testid="viewer-loading-percent">{progress > 0 ? `${progress}%` : "Conectando..."}</p>
          <div className="viewer-loading-progress mt-4 h-1.5 w-4/5 overflow-hidden rounded-full bg-[#E5E5EA]" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Carga del modelo BIM" data-testid="viewer-loading-progress">
            <div className="h-full rounded-full bg-[#1C1C1E] transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="viewer-loading-size mt-3 text-xs text-[#8E8E93]" data-testid="viewer-loading-size">El modelo pesa 57 MB, puede tardar un momento</p>
        </div>
      </div>
    </div>
  </div>
);
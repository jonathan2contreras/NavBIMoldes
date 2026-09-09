import React, { useCallback, useEffect, useState } from "react";
import { Layers, Loader2, X } from "lucide-react";

import { api } from "../lib/api";
import { MoldSelect } from "./MoldSelect";

export const BulkTagModal = ({ objectNames, onClose, onApplied }) => {
  const [molds, setMolds] = useState([]);
  const [molde, setMolde] = useState(null);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getMolds()
      .then((r) => setMolds(r.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleApply = useCallback(async () => {
    if (!molde && !notas.trim()) {
      setError("Define al menos un campo para aplicar.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.bulkSaveTags({ object_names: objectNames, molde, notas: notas.trim(), photo: null });
      onApplied?.();
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo aplicar el etiquetado masivo. Inténtalo de nuevo.");
      setSaving(false);
    }
  }, [objectNames, molde, notas, onApplied, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={() => !saving && onClose()}
      data-testid="bulk-tag-modal"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E5E5EA] px-5 py-4">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-[#1C1C1E]" />
            <p className="text-base font-bold text-[#111111]" data-testid="bulk-tag-title">
              Etiquetado masivo · {objectNames.length} piezas
            </p>
          </div>
          <button data-testid="bulk-tag-close" onClick={onClose} className="rounded-full p-1.5 hover:bg-[#F2F2F7]">
            <X size={18} className="text-[#8E8E93]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#636366]">Molde de fabricación</p>
          <MoldSelect value={molde} onChange={setMolde} molds={molds} />

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[#636366]">Notas</p>
          <textarea
            data-testid="bulk-notas-input"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Añadir una nota a todas las piezas seleccionadas..."
            className="min-h-[70px] w-full resize-y rounded-xl bg-[#F2F2F7] px-3 py-3 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
          />

          {!!error && (
            <p className="mt-3 text-[13px] text-[#FF3B30]" data-testid="bulk-tag-error">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-[#E5E5EA] p-4">
          <button
            data-testid="bulk-tag-apply-button"
            onClick={handleApply}
            disabled={saving}
            className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-[#1C1C1E] text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-70"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : `Aplicar a ${objectNames.length} piezas`}
          </button>
        </div>
      </div>
    </div>
  );
};

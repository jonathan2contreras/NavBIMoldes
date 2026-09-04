import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Layers, Loader2, X } from "lucide-react";

import { api } from "../lib/api";
import { MoldPicker } from "./MoldPicker";

export const BulkTagModal = ({ objectNames, onClose, onApplied }) => {
  const [molds, setMolds] = useState([]);
  const [molde, setMolde] = useState(null);
  const [notas, setNotas] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
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

  const handlePhotoPick = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }, []);

  const handleApply = useCallback(async () => {
    if (!molde && !notas.trim() && !photoFile) {
      setError("Define al menos un campo para aplicar.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let photoPath = null;
      if (photoFile) {
        const up = await api.uploadPhoto(photoFile);
        photoPath = up.path;
      }
      await api.bulkSaveTags({ object_names: objectNames, molde, notas: notas.trim(), photo: photoPath });
      onApplied?.();
      onClose();
    } catch {
      setError("No se pudo aplicar el etiquetado masivo. Inténtalo de nuevo.");
      setSaving(false);
    }
  }, [objectNames, molde, notas, photoFile, onApplied, onClose]);

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
          <MoldPicker value={molde} onChange={setMolde} molds={molds} onMoldsChange={setMolds} />

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[#636366]">Notas</p>
          <textarea
            data-testid="bulk-notas-input"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Añadir una nota a todas las piezas seleccionadas..."
            className="min-h-[70px] w-full resize-y rounded-xl bg-[#F2F2F7] px-3 py-3 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
          />

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[#636366]">Foto (opcional, misma para todas)</p>
          {photoPreview ? (
            <img src={photoPreview} alt="Vista previa" className="h-16 w-16 rounded-lg border border-[#E5E5EA] object-cover" data-testid="bulk-photo-preview" />
          ) : (
            <button
              data-testid="bulk-photo-attach-button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 items-center gap-1.5 rounded-full border border-[#E5E5EA] bg-white px-3.5 text-[13px] font-semibold text-[#3A3A3C] hover:bg-[#F2F2F7]"
            >
              <Camera size={15} /> Adjuntar foto
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoPick}
            data-testid="bulk-photo-file-input"
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Compass, Eye, Loader2, Trash2, X } from "lucide-react";

import { api, fileUrl } from "../lib/api";
import { MoldPicker } from "./MoldPicker";
import { PanelPreview } from "./panel3d/PanelPreview";
import { useRole } from "../context/RoleContext";
import { FACADE_LABELS, displayName, formatArea, formatDate, formatDims, tipoLabel } from "../lib/theme";

export const TagSheet = ({ obj, onClose, onSaved }) => {
  const { isAdmin } = useRole();
  const readOnly = !isAdmin;
  const [molds, setMolds] = useState([]);
  const [molde, setMolde] = useState(obj.molde ?? null);
  const [notas, setNotas] = useState(obj.notas ?? "");
  const [existingPhoto, setExistingPhoto] = useState(obj.photo ?? null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .getMolds()
      .then((r) => setMolds(r.items || []))
      .catch(() => {});
  }, []);

  const history = useMemo(
    () => [...(obj.history || [])].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [obj.history]
  );

  const handlePhotoPick = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }, []);

  const clearNewPhoto = useCallback(() => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [photoPreview]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      let photoPath = existingPhoto;
      if (photoFile) {
        const up = await api.uploadPhoto(photoFile);
        photoPath = up.path;
      }
      const payload = { object_name: obj.name, molde, notas: notas.trim(), photo: photoPath };
      await api.saveTag(payload);
      onSaved?.({ ...obj, ...payload });
      onClose();
    } catch {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }, [obj, molde, notas, photoFile, existingPhoto, onSaved, onClose]);

  const handleDeleteTag = useCallback(async () => {
    setDeleting(true);
    try {
      await api.deleteTag(obj.name);
      onSaved?.({ ...obj, molde: null, notas: "", photo: null });
      onClose();
    } catch {
      setError("No se pudo eliminar la etiqueta.");
      setDeleting(false);
    }
  }, [obj, onSaved, onClose]);

  const dims = formatDims(obj.dimensions);
  const area = formatArea(obj.dimensions);
  const selectedMold = molds.find((m) => m.name === molde) || null;
  const hasAnyData = !!(obj.molde || obj.notas || obj.photo);

  return (
    <div className="fixed inset-0 z-50" data-testid="tag-sheet">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} data-testid="tag-sheet-backdrop" />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl sm:rounded-l-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="flex items-center gap-3 p-5 pb-4">
          <PanelPreview obj={obj} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-[#111111]" data-testid="tag-sheet-object-name">
              {displayName(obj.name)}
            </p>
            {!!obj.facade && FACADE_LABELS[obj.facade] && (
              <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-[#007AFF]" data-testid="tag-sheet-facade">
                <Compass size={13} /> Fachada {FACADE_LABELS[obj.facade]}
              </p>
            )}
            <p className="mt-0.5 text-xs text-[#8E8E93]" data-testid="tag-sheet-mark">
              Pieza: {obj.mark || obj.name.split(" ")[0]}
            </p>
            {!!dims && (
              <p className="mt-0.5 text-xs text-[#8E8E93]" data-testid="tag-sheet-dimensions">
                Dimensiones (modelo 3D): {dims} (ancho × alto)
              </p>
            )}
            {!!area && (
              <p className="mt-0.5 text-xs text-[#8E8E93]" data-testid="tag-sheet-area">
                Superficie: {area}
              </p>
            )}
          </div>
          <button onClick={onClose} data-testid="tag-sheet-close" className="rounded-full p-1.5 hover:bg-[#F2F2F7]">
            <X size={18} className="text-[#8E8E93]" />
          </button>
        </div>

        <div className="px-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#636366]">Molde de fabricación</p>
          {readOnly ? (
            selectedMold ? (
              <div className="flex items-center gap-2 rounded-xl border-[1.5px] border-[#E5E5EA] px-3.5 py-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: selectedMold.color }} />
                <span className="text-sm font-bold text-[#111111]" data-testid="tag-sheet-molde-readonly">
                  {selectedMold.name} · {tipoLabel(selectedMold.tipo)}
                </span>
              </div>
            ) : (
              <p className="text-sm text-[#8E8E93]" data-testid="tag-sheet-molde-readonly">Sin molde asignado</p>
            )
          ) : (
            <MoldPicker value={molde} onChange={setMolde} molds={molds} onMoldsChange={setMolds} />
          )}
          {!!selectedMold && (selectedMold.ancho || selectedMold.alto) && (
            <p className="mt-2 text-xs text-[#8E8E93]" data-testid="tag-sheet-mold-medidas">
              Medidas del molde: {selectedMold.ancho || "—"} × {selectedMold.alto || "—"} m (ancho × alto)
            </p>
          )}

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[#636366]">Notas</p>
          <textarea
            data-testid="notas-input"
            disabled={readOnly}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Añadir una nota..."
            className="min-h-[80px] w-full resize-y rounded-xl bg-[#F2F2F7] px-3 py-3 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93] disabled:opacity-60"
          />

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[#636366]">Foto</p>
          {photoPreview ? (
            <div className="flex items-center gap-3" data-testid="photo-preview">
              <img src={photoPreview} alt="Foto adjunta" className="h-16 w-16 rounded-lg border border-[#E5E5EA] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#111111]">{photoFile?.name}</p>
                <p className="text-[11px] text-[#8E8E93]">Se adjuntará al guardar</p>
              </div>
              {!readOnly && (
                <button onClick={clearNewPhoto} data-testid="photo-remove-button" className="rounded-full p-1.5 hover:bg-[#F2F2F7]">
                  <X size={16} className="text-[#8E8E93]" />
                </button>
              )}
            </div>
          ) : existingPhoto ? (
            <div className="flex items-center gap-3" data-testid="photo-existing">
              <img
                src={fileUrl(existingPhoto)}
                alt="Foto de obra"
                className="h-16 w-16 rounded-lg border border-[#E5E5EA] object-cover"
              />
              {!readOnly && (
                <button
                  data-testid="photo-delete-existing-button"
                  onClick={() => setExistingPhoto(null)}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-[#E5E5EA] bg-white px-3.5 text-[13px] font-semibold text-[#3A3A3C] hover:bg-[#F2F2F7]"
                >
                  <Trash2 size={14} /> Quitar foto
                </button>
              )}
            </div>
          ) : (
            !readOnly && (
              <button
                data-testid="photo-attach-button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-9 items-center gap-1.5 rounded-full border border-[#E5E5EA] bg-white px-3.5 text-[13px] font-semibold text-[#3A3A3C] transition-colors hover:bg-[#F2F2F7]"
              >
                <Camera size={15} /> Adjuntar foto
              </button>
            )
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoPick}
            data-testid="photo-file-input"
          />

          {!!error && (
            <p className="mt-2 text-[13px] text-[#FF3B30]" data-testid="tag-sheet-error">
              {error}
            </p>
          )}

          {history.length > 0 && (
            <>
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[#636366]">Historial de cambios</p>
              <div className="max-h-[160px] overflow-y-auto rounded-xl bg-[#F2F2F7] px-3 py-2" data-testid="tag-sheet-history">
                {history.map((h, i) => {
                  const m = molds.find((mm) => mm.name === h.molde);
                  return (
                    <div key={`h-${h.date}-${i}`} className="flex items-center gap-2 py-1.5" data-testid={`history-entry-${i}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: m ? m.color : "#B4BAC6" }} />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#111111]">
                        {h.molde || "Sin molde"}
                      </span>
                      <span className="shrink-0 text-xs text-[#8E8E93]">{formatDate(h.date)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2 p-5">
          {readOnly ? (
            <div className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#F2F2F7] text-[13px] font-semibold text-[#8E8E93]" data-testid="tag-sheet-readonly-note">
              <Eye size={16} /> Modo usuario — solo visualización
            </div>
          ) : (
            <>
              <button
                data-testid="tag-sheet-save-button"
                onClick={handleSave}
                disabled={saving || deleting}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#1C1C1E] text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-70"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : "Guardar"}
              </button>
              {hasAnyData && (
                confirmDelete ? (
                  <div className="flex items-center gap-2" data-testid="tag-sheet-delete-confirm">
                    <button
                      data-testid="tag-sheet-delete-confirm-button"
                      onClick={handleDeleteTag}
                      disabled={deleting}
                      className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#FF3B30] text-sm font-bold text-white disabled:opacity-70"
                    >
                      {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Confirmar borrado
                    </button>
                    <button
                      data-testid="tag-sheet-delete-cancel-button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="h-10 rounded-xl bg-[#F2F2F7] px-4 text-sm font-bold text-[#3A3A3C]"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    data-testid="tag-sheet-delete-button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-[#FF3B30] hover:bg-[#FFF0EE]"
                  >
                    <Trash2 size={15} /> Eliminar etiqueta completa
                  </button>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

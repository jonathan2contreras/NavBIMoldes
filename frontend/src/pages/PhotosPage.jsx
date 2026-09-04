import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, Check, Compass, ImagePlus, Loader2, Search, Trash2, X } from "lucide-react";

import { api, fileUrl } from "../lib/api";
import { Chip } from "../components/Chip";
import { useRole } from "../context/RoleContext";
import { FACADE_FILTERS, FACADE_LABELS, displayName, formatDate, statusMeta } from "../lib/theme";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function PhotosPage() {
  const { isAdmin } = useRole();
  const [facade, setFacade] = useState("all");
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const newFileInputRef = useRef(null);
  const [adding, setAdding] = useState(false);
  const [newFile, setNewFile] = useState(null);
  const [newPreview, setNewPreview] = useState(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedObj, setSelectedObj] = useState(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleNewPick = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewFile(file);
    setNewPreview(URL.createObjectURL(file));
    setSelectedObj(null);
    setNote("");
    setSearch("");
    setResults([]);
    setUploadError("");
    setAdding(true);
  }, []);

  const closeAdd = useCallback(() => {
    setAdding(false);
    setNewFile(null);
    setNewPreview((p) => {
      if (p) URL.revokeObjectURL(p);
      return null;
    });
    setSearch("");
    setResults([]);
    setSelectedObj(null);
    setNote("");
    setUploadError("");
    if (newFileInputRef.current) newFileInputRef.current.value = "";
  }, []);

  const openLightbox = (it) => {
    setLightbox(it);
    setConfirmDelete(false);
    setDeleteError("");
  };

  const handleDelete = useCallback(async () => {
    if (!lightbox) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.deletePhoto(lightbox.name, lightbox.photo);
      setData((d) => d && { total: d.total - 1, items: d.items.filter((it) => it.photo !== lightbox.photo) });
      setLightbox(null);
    } catch {
      setDeleteError("No se pudo eliminar la foto. Inténtalo de nuevo.");
    } finally {
      setDeleting(false);
    }
  }, [lightbox]);

  const fetchPhotos = useCallback(
    async (fac, from, to) => {
      const f = from.trim();
      const t = to.trim();
      if ((f && !DATE_RE.test(f)) || (t && !DATE_RE.test(t))) {
        setError("Fechas inválidas. Usa el formato AAAA-MM-DD.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        setData(await api.getPhotos({ facade: fac, from: f, to: t }));
      } catch {
        setError("Error al cargar las fotos.");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPhotos(facade, fromText, toText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facade]);

  useEffect(() => {
    if (!adding) return undefined;
    const q = search.trim();
    const h = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await api.getObjects({ search: q, limit: 20 });
        setResults(r.items || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(h);
  }, [search, adding]);

  const handleUpload = useCallback(async () => {
    if (!newFile || !selectedObj) return;
    setUploading(true);
    setUploadError("");
    try {
      const up = await api.uploadPhoto(newFile);
      await api.saveTag({
        object_name: selectedObj.name,
        status: selectedObj.status ?? null,
        observation: note.trim(),
        photo: up.path,
      });
      closeAdd();
      fetchPhotos(facade, fromText, toText);
    } catch {
      setUploadError("No se pudo subir la foto. Inténtalo de nuevo.");
      setUploading(false);
    }
  }, [newFile, selectedObj, note, closeAdd, fetchPhotos, facade, fromText, toText]);

  return (
    <div className="h-full overflow-y-auto bg-white" data-testid="photos-screen">
      <div className="mx-auto w-full max-w-4xl px-4 pb-8 pt-4">
        <div className="flex items-baseline justify-between pb-2">
          <h1 className="text-2xl font-extrabold text-[#111111]">Fotos de obra</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[#8E8E93]" data-testid="photos-total-count">
              {loading ? "Cargando..." : `${(data?.total || 0).toLocaleString("es-ES")} fotos`}
            </span>
            {isAdmin && (
              <>
                <input
                  ref={newFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleNewPick}
                  data-testid="photos-add-file-input"
                />
                <button
                  data-testid="photos-add-button"
                  onClick={() => newFileInputRef.current?.click()}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#1C1C1E] px-3.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                >
                  <ImagePlus size={15} /> Añadir foto
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto py-2">
          {FACADE_FILTERS.map((f) => (
            <Chip
              key={f.key}
              testId={`photos-facade-${f.key}`}
              selected={facade === f.key}
              color="#007AFF"
              icon={f.key !== "all" ? <Compass size={13} color={facade === f.key ? "#FFFFFF" : "#007AFF"} /> : null}
              label={f.label}
              onClick={() => setFacade(f.key)}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 py-2">
          <input
            data-testid="photos-from-input"
            value={fromText}
            onChange={(e) => setFromText(e.target.value)}
            placeholder="Desde AAAA-MM-DD"
            className="h-11 flex-1 rounded-xl bg-[#F2F2F7] px-3 text-[13px] text-[#111111] outline-none placeholder:text-[#8E8E93]"
          />
          <ArrowRight size={14} className="shrink-0 text-[#8E8E93]" />
          <input
            data-testid="photos-to-input"
            value={toText}
            onChange={(e) => setToText(e.target.value)}
            placeholder="Hasta AAAA-MM-DD"
            className="h-11 flex-1 rounded-xl bg-[#F2F2F7] px-3 text-[13px] text-[#111111] outline-none placeholder:text-[#8E8E93]"
          />
          <button
            data-testid="photos-apply-button"
            onClick={() => fetchPhotos(facade, fromText, toText)}
            className="h-11 shrink-0 rounded-xl bg-[#1C1C1E] px-4 text-[13px] font-bold text-white"
          >
            Aplicar
          </button>
        </div>

        {!!error && (
          <p className="py-2 text-[13px] text-[#FF3B30]" data-testid="photos-error">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16" data-testid="photos-loading">
            <Loader2 size={32} className="animate-spin text-[#1C1C1E]" />
          </div>
        ) : (data?.items || []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16" data-testid="photos-empty">
            <Camera size={40} className="text-[#C7C7CC]" />
            <p className="text-[15px] font-bold text-[#111111]">Sin fotos de obra</p>
            <p className="px-6 text-center text-xs text-[#8E8E93]">
              Adjunta fotos a las notas de las piezas desde su ficha
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3 lg:grid-cols-4" data-testid="photos-grid">
            {data.items.map((it, i) => {
              const meta = statusMeta(it.status);
              return (
                <div
                  key={`${it.photo}-${i}`}
                  data-testid={`photo-card-${i}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openLightbox(it)}
                  onKeyDown={(e) => e.key === "Enter" && openLightbox(it)}
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-[#E5E5EA] bg-white text-left transition-shadow hover:shadow-md"
                >
                  <img
                    src={fileUrl(it.photo)}
                    alt={displayName(it.name)}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  {isAdmin && (
                    <button
                      data-testid={`photo-delete-button-${i}`}
                      title="Eliminar foto"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLightbox(it);
                        setConfirmDelete(true);
                      }}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#1C1C1E]/75 text-white opacity-0 transition-opacity hover:bg-[#FF3B30] group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="p-2.5">
                    <p className="truncate text-[13px] font-semibold text-[#111111]">{displayName(it.name)}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px]">
                      {!!it.facade && FACADE_LABELS[it.facade] && (
                        <span className="font-semibold text-[#007AFF]">{FACADE_LABELS[it.facade]}</span>
                      )}
                      {!!meta && (
                        <span className="font-semibold" style={{ color: meta.accent }}>
                          · {meta.label}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#8E8E93]">{formatDate(it.date)}</p>
                    {!!it.text && <p className="mt-1 truncate text-[11px] text-[#3A3A3C]">{it.text}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-6"
          onClick={() => setLightbox(null)}
          data-testid="photo-lightbox"
        >
          <button
            data-testid="photo-lightbox-close"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
          >
            <X size={22} />
          </button>
          <img
            src={fileUrl(lightbox.photo)}
            alt={displayName(lightbox.name)}
            className="max-h-[75vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-3 text-center">
            <p className="text-sm font-bold text-white">{displayName(lightbox.name)}</p>
            <p className="mt-0.5 text-xs text-white/70">
              {lightbox.facade && FACADE_LABELS[lightbox.facade] ? `Fachada ${FACADE_LABELS[lightbox.facade]} · ` : ""}
              {formatDate(lightbox.date)}
            </p>
            {!!lightbox.text && <p className="mt-1 max-w-xl text-xs text-white/80">{lightbox.text}</p>}
            {isAdmin && (
              <div className="mt-4 flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {confirmDelete ? (
                  <div className="flex items-center gap-2" data-testid="photo-delete-confirm">
                    <span className="text-xs font-semibold text-white">¿Eliminar esta foto?</span>
                    <button
                      data-testid="photo-delete-confirm-button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex h-9 items-center gap-1.5 rounded-full bg-[#FF3B30] px-4 text-xs font-bold text-white disabled:opacity-70"
                    >
                      {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Sí, eliminar
                    </button>
                    <button
                      data-testid="photo-delete-cancel-button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="h-9 rounded-full bg-white/15 px-4 text-xs font-bold text-white hover:bg-white/25"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    data-testid="photo-lightbox-delete-button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-4 text-xs font-bold text-white hover:bg-[#FF3B30]"
                  >
                    <Trash2 size={14} /> Eliminar foto
                  </button>
                )}
                {!!deleteError && (
                  <p className="text-xs text-[#FF6B6B]" data-testid="photo-delete-error">
                    {deleteError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {adding && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => !uploading && closeAdd()}
          data-testid="photos-add-modal"
        >
          <div
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E5EA] px-5 py-4">
              <p className="text-base font-bold text-[#111111]">Añadir foto de obra</p>
              <button
                data-testid="photos-add-close"
                onClick={() => !uploading && closeAdd()}
                className="rounded-full p-1.5 hover:bg-[#F2F2F7]"
              >
                <X size={18} className="text-[#8E8E93]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {newPreview && (
                <img
                  src={newPreview}
                  alt="Vista previa"
                  className="mb-4 max-h-56 w-full rounded-xl border border-[#E5E5EA] object-contain"
                  data-testid="photos-add-preview"
                />
              )}

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#636366]">Pieza / panel</p>
              {selectedObj ? (
                <div
                  className="flex items-center gap-2 rounded-xl border-[1.5px] border-[#34C759] bg-[#E8F8EE] px-3 py-2.5"
                  data-testid="photos-add-selected"
                >
                  <Check size={16} className="shrink-0 text-[#34C759]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-[#111111]">{displayName(selectedObj.name)}</p>
                    {!!selectedObj.facade && FACADE_LABELS[selectedObj.facade] && (
                      <p className="text-[11px] font-semibold text-[#007AFF]">
                        Fachada {FACADE_LABELS[selectedObj.facade]}
                      </p>
                    )}
                  </div>
                  <button
                    data-testid="photos-add-change-piece"
                    onClick={() => setSelectedObj(null)}
                    className="rounded-full p-1.5 hover:bg-white"
                  >
                    <X size={15} className="text-[#8E8E93]" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 rounded-xl bg-[#F2F2F7] px-3">
                    <Search size={15} className="shrink-0 text-[#8E8E93]" />
                    <input
                      data-testid="photos-add-search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar pieza por nombre..."
                      autoFocus
                      className="h-11 flex-1 bg-transparent text-[13px] text-[#111111] outline-none placeholder:text-[#8E8E93]"
                    />
                    {searching && <Loader2 size={15} className="animate-spin text-[#8E8E93]" />}
                  </div>
                  <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-[#E5E5EA]">
                    {results.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-[#8E8E93]">
                        {searching ? "Buscando..." : "Escribe para buscar una pieza"}
                      </p>
                    ) : (
                      results.map((o, i) => {
                        const meta = statusMeta(o.status);
                        return (
                          <button
                            key={o.name}
                            data-testid={`photos-add-result-${i}`}
                            onClick={() => setSelectedObj(o)}
                            className="flex w-full items-center gap-2 border-b border-[#F2F2F7] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#F2F2F7]"
                          >
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: meta ? meta.accent : "#B4BAC6" }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold text-[#111111]">
                                {displayName(o.name)}
                              </p>
                              <p className="text-[11px] text-[#8E8E93]">
                                {o.facade && FACADE_LABELS[o.facade] ? `${FACADE_LABELS[o.facade]}` : "Sin fachada"}
                                {meta ? ` · ${meta.label}` : ""}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}

              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[#636366]">Nota (opcional)</p>
              <textarea
                data-testid="photos-add-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Añadir una nota..."
                className="min-h-[70px] w-full resize-y rounded-xl bg-[#F2F2F7] px-3 py-3 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
              />

              {!!uploadError && (
                <p className="mt-2 text-[13px] text-[#FF3B30]" data-testid="photos-add-error">
                  {uploadError}
                </p>
              )}
            </div>

            <div className="border-t border-[#E5E5EA] p-4">
              <button
                data-testid="photos-add-save"
                onClick={handleUpload}
                disabled={!selectedObj || uploading}
                className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-[#1C1C1E] text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                {uploading ? "Subiendo..." : "Guardar foto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
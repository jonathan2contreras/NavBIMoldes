import React, { useCallback, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Check, ChevronDown, Layers, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { api } from "../lib/api";
import { useRole } from "../context/RoleContext";

export default function MoldsPage() {
  const { isAdmin } = useRole();

  const [tipos, setTipos] = useState([]);
  const [molds, setMolds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [creatingMold, setCreatingMold] = useState(false);
  const [moldForm, setMoldForm] = useState({ name: "", tipo: "", color: "#007AFF", ancho: "", alto: "" });
  const [moldSaving, setMoldSaving] = useState(false);
  const [moldError, setMoldError] = useState("");
  const [editingMold, setEditingMold] = useState(null);
  const [confirmDeleteMold, setConfirmDeleteMold] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, m] = await Promise.all([api.getTipos(), api.getMolds()]);
      setTipos(t.items || []);
      setMolds(m.items || []);
    } catch {
      // no-op, sections just render empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addTipoToCatalog = useCallback((name) => {
    setTipos((prev) => (prev.includes(name) ? prev : [...prev, name].sort((a, b) => a.localeCompare(b))));
  }, []);

  const removeTipoFromCatalog = useCallback(async (name) => {
    try {
      await api.deleteTipo(name);
      setTipos((prev) => prev.filter((t) => t !== name));
      setMolds((prev) => prev.map((m) => (m.tipo === name ? { ...m, tipo: null } : m)));
    } catch {
      setMoldError("No se pudo eliminar el tipo.");
    }
  }, []);

  const openCreateMold = () => {
    setMoldForm({ name: "", tipo: "", color: "#007AFF", ancho: "", alto: "" });
    setMoldError("");
    setCreatingMold(true);
    setEditingMold(null);
  };

  const openEditMold = (m) => {
    setMoldForm({
      name: m.name,
      tipo: m.tipo || "",
      color: m.color || "#007AFF",
      ancho: m.ancho ?? "",
      alto: m.alto ?? "",
    });
    setMoldError("");
    setEditingMold(m.name);
    setCreatingMold(false);
  };

  const closeMoldForm = () => {
    setCreatingMold(false);
    setEditingMold(null);
  };

  const handleSaveMold = useCallback(async () => {
    const name = moldForm.name.trim();
    if (!name) {
      setMoldError("El nombre del molde es obligatorio.");
      return;
    }
    if (!moldForm.tipo) {
      setMoldError("Selecciona un tipo de molde.");
      return;
    }
    setMoldSaving(true);
    setMoldError("");
    try {
      const mold = await api.saveMold({
        name,
        tipo: moldForm.tipo,
        color: moldForm.color,
        ancho: moldForm.ancho === "" ? null : Number(moldForm.ancho),
        alto: moldForm.alto === "" ? null : Number(moldForm.alto),
      });
      setMolds((prev) => {
        const others = prev.filter((m) => m.name !== mold.name);
        return [...others, mold].sort((a, b) => a.name.localeCompare(b.name));
      });
      if (mold.tipo) addTipoToCatalog(mold.tipo);
      closeMoldForm();
    } catch {
      setMoldError("No se pudo guardar el molde. Inténtalo de nuevo.");
    } finally {
      setMoldSaving(false);
    }
  }, [moldForm, addTipoToCatalog]);

  const handleDeleteMold = useCallback(async (name) => {
    try {
      await api.deleteMold(name);
      setMolds((prev) => prev.filter((m) => m.name !== name));
      setConfirmDeleteMold(null);
    } catch {
      setMoldError("No se pudo eliminar el molde.");
    }
  }, []);

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="h-full overflow-y-auto bg-white" data-testid="molds-screen">
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-4">
        <h1 className="text-2xl font-extrabold text-[#111111]">Moldes</h1>
        <p className="mt-0.5 text-[13px] text-[#636366]">Catálogo de moldes de fabricación</p>

        {loading ? (
          <div className="flex justify-center py-16" data-testid="molds-loading">
            <Loader2 size={32} className="animate-spin text-[#1C1C1E]" />
          </div>
        ) : (
          <section className="mt-6" data-testid="molds-section">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers size={16} className="text-[#636366]" />
                <h2 className="text-xs font-bold uppercase tracking-wide text-[#636366]">Catálogo de moldes</h2>
              </div>
              {!creatingMold && (
                <button
                  data-testid="mold-new-toggle"
                  onClick={openCreateMold}
                  className="flex h-8 items-center gap-1.5 rounded-full bg-[#1C1C1E] px-3 text-xs font-bold text-white"
                >
                  <Plus size={13} /> Nuevo molde
                </button>
              )}
            </div>

            {creatingMold && (
              <MoldForm
                form={moldForm}
                setForm={setMoldForm}
                tipos={tipos}
                onTipoCreated={addTipoToCatalog}
                onTipoDeleted={removeTipoFromCatalog}
                saving={moldSaving}
                error={moldError}
                isNew
                onCancel={closeMoldForm}
                onSave={handleSaveMold}
              />
            )}

            <div className="mt-3 flex flex-col gap-2" data-testid="molds-list">
              {molds.length === 0 && !creatingMold && (
                <p className="py-8 text-center text-sm text-[#8E8E93]" data-testid="molds-empty">
                  Aún no hay moldes creados.
                </p>
              )}
              {molds.map((m) =>
                editingMold === m.name ? (
                  <MoldForm
                    key={m.name}
                    form={moldForm}
                    setForm={setMoldForm}
                    tipos={tipos}
                    onTipoCreated={addTipoToCatalog}
                    onTipoDeleted={removeTipoFromCatalog}
                    saving={moldSaving}
                    error={moldError}
                    onCancel={closeMoldForm}
                    onSave={handleSaveMold}
                  />
                ) : (
                  <div
                    key={m.name}
                    data-testid={`mold-card-${m.name}`}
                    className="flex items-center gap-3 rounded-xl border border-[#E5E5EA] px-3.5 py-3"
                  >
                    <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#111111]">{m.name}</p>
                      <p className="mt-0.5 text-xs text-[#8E8E93]">
                        {m.tipo || "Sin tipo"}
                        {m.ancho && m.alto ? ` · ${m.ancho}×${m.alto} m` : ""}
                      </p>
                    </div>
                    <button
                      data-testid={`mold-edit-${m.name}`}
                      onClick={() => openEditMold(m)}
                      className="shrink-0 rounded-full p-2 hover:bg-[#F2F2F7]"
                    >
                      <Pencil size={15} className="text-[#8E8E93]" />
                    </button>
                    {confirmDeleteMold === m.name ? (
                      <div className="flex shrink-0 items-center gap-1.5" data-testid={`mold-delete-confirm-${m.name}`}>
                        <button
                          data-testid={`mold-delete-confirm-yes-${m.name}`}
                          onClick={() => handleDeleteMold(m.name)}
                          className="flex h-8 items-center gap-1 rounded-full bg-[#FF3B30] px-2.5 text-xs font-bold text-white"
                        >
                          <Trash2 size={12} /> Borrar
                        </button>
                        <button
                          data-testid={`mold-delete-confirm-no-${m.name}`}
                          onClick={() => setConfirmDeleteMold(null)}
                          className="flex h-8 items-center rounded-full bg-[#F2F2F7] px-2.5 text-xs font-bold text-[#3A3A3C]"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        data-testid={`mold-delete-${m.name}`}
                        onClick={() => setConfirmDeleteMold(m.name)}
                        className="shrink-0 rounded-full p-2 hover:bg-[#FFF0EE]"
                      >
                        <Trash2 size={15} className="text-[#FF3B30]" />
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TipoSelect({ value, onChange, tipos, onTipoCreated, onTipoDeleted }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleCreate = async () => {
    const n = newName.trim();
    if (!n) return;
    setSaving(true);
    try {
      const r = await api.createTipo(n);
      onTipoCreated?.(r.name);
      onChange(r.name);
      setNewName("");
      setCreating(false);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        data-testid="mold-form-tipo-trigger"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-lg bg-white px-3 text-left text-sm text-[#111111]"
      >
        <span className={value ? "font-semibold" : "text-[#8E8E93]"}>{value || "Selecciona un tipo de molde"}</span>
        <ChevronDown size={16} className="text-[#8E8E93]" />
      </button>

      {open && (
        <div
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[#E5E5EA] bg-white py-1 shadow-xl"
          data-testid="mold-form-tipo-dropdown"
        >
          {tipos.length === 0 && !creating && (
            <p className="px-3 py-2 text-xs text-[#8E8E93]">Aún no hay tipos. Crea el primero.</p>
          )}
          {tipos.map((t) => (
            <div key={t} className="flex items-center gap-1 px-1">
              <button
                type="button"
                data-testid={`mold-form-tipo-option-${t}`}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium text-[#111111] hover:bg-[#F2F2F7]"
              >
                <span className="min-w-0 flex-1 truncate">{t}</span>
                {value === t && <Check size={14} className="shrink-0 text-[#34C759]" />}
              </button>
              {confirmDelete === t ? (
                <>
                  <button
                    type="button"
                    data-testid={`mold-form-tipo-delete-yes-${t}`}
                    onClick={() => {
                      setConfirmDelete(null);
                      onTipoDeleted?.(t);
                    }}
                    className="h-7 shrink-0 rounded-full bg-[#FF3B30] px-2 text-[11px] font-bold text-white"
                  >
                    Borrar
                  </button>
                  <button
                    type="button"
                    data-testid={`mold-form-tipo-delete-no-${t}`}
                    onClick={() => setConfirmDelete(null)}
                    className="shrink-0 rounded-full p-1.5 hover:bg-[#F2F2F7]"
                  >
                    <X size={13} className="text-[#8E8E93]" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  data-testid={`mold-form-tipo-delete-${t}`}
                  onClick={() => setConfirmDelete(t)}
                  className="shrink-0 rounded-full p-1.5 hover:bg-[#FFF0EE]"
                >
                  <Trash2 size={13} className="text-[#FF3B30]" />
                </button>
              )}
            </div>
          ))}

          <div className="mt-1 border-t border-[#F2F2F7] px-1 pt-1">
            {creating ? (
              <div className="flex items-center gap-1 px-1.5 py-1">
                <input
                  autoFocus
                  data-testid="mold-form-tipo-new-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Nombre del nuevo tipo"
                  className="h-8 min-w-0 flex-1 rounded-lg bg-[#F2F2F7] px-2.5 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
                />
                <button
                  type="button"
                  data-testid="mold-form-tipo-new-save"
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1C1C1E] text-white disabled:opacity-70"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button type="button" onClick={() => setCreating(false)} className="shrink-0 rounded-full p-1.5 hover:bg-[#F2F2F7]">
                  <X size={14} className="text-[#8E8E93]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="mold-form-tipo-new-toggle"
                onClick={() => setCreating(true)}
                className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-sm font-bold text-[#007AFF] hover:bg-[#F2F2F7]"
              >
                <Plus size={14} /> Crear nuevo tipo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MoldForm({ form, setForm, tipos, onTipoCreated, onTipoDeleted, saving, error, isNew, onCancel, onSave }) {
  return (
    <div className="mt-3 flex flex-col gap-2.5 rounded-xl bg-[#F2F2F7] p-3.5" data-testid="mold-form">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-[#636366]">{isNew ? "Nuevo molde" : `Editar ${form.name}`}</p>
        <button onClick={onCancel} data-testid="mold-form-cancel">
          <X size={16} className="text-[#8E8E93]" />
        </button>
      </div>
      {isNew && (
        <input
          data-testid="mold-form-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Nombre del molde (ej. M-01)"
          className="h-10 rounded-lg bg-white px-3 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
        />
      )}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#8E8E93]">Tipo de molde</span>
        <TipoSelect
          value={form.tipo}
          onChange={(t) => setForm((f) => ({ ...f, tipo: t }))}
          tipos={tipos}
          onTipoCreated={onTipoCreated}
          onTipoDeleted={onTipoDeleted}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          data-testid="mold-form-ancho"
          type="number"
          step="0.01"
          value={form.ancho}
          onChange={(e) => setForm((f) => ({ ...f, ancho: e.target.value }))}
          placeholder="Ancho (m)"
          className="h-10 flex-1 rounded-lg bg-white px-3 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
        />
        <span className="text-[#8E8E93]">×</span>
        <input
          data-testid="mold-form-alto"
          type="number"
          step="0.01"
          value={form.alto}
          onChange={(e) => setForm((f) => ({ ...f, alto: e.target.value }))}
          placeholder="Alto (m)"
          className="h-10 flex-1 rounded-lg bg-white px-3 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          data-testid="mold-form-color"
          type="color"
          value={form.color}
          onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
          className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-[#E5E5EA]"
        />
        <span className="text-xs font-medium text-[#8E8E93]">Color para etiquetar el panel (visor 3D)</span>
      </div>
      {!!error && (
        <p className="text-xs text-[#FF3B30]" data-testid="mold-form-error">
          {error}
        </p>
      )}
      <button
        data-testid="mold-form-save"
        onClick={onSave}
        disabled={saving}
        className="flex h-10 items-center justify-center rounded-lg bg-[#1C1C1E] text-sm font-bold text-white disabled:opacity-70"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : "Guardar"}
      </button>
    </div>
  );
}

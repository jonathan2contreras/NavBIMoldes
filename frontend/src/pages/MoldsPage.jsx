import React, { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Check, Layers, Loader2, Pencil, Plus, Shapes, Trash2, X } from "lucide-react";

import { api } from "../lib/api";
import { useRole } from "../context/RoleContext";

export default function MoldsPage() {
  const { isAdmin } = useRole();

  const [tipos, setTipos] = useState([]);
  const [molds, setMolds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newTipo, setNewTipo] = useState("");
  const [tipoSaving, setTipoSaving] = useState(false);
  const [tipoError, setTipoError] = useState("");
  const [editingTipo, setEditingTipo] = useState(null);
  const [editTipoValue, setEditTipoValue] = useState("");

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

  const handleCreateTipo = useCallback(async () => {
    const n = newTipo.trim();
    if (!n) return;
    setTipoSaving(true);
    setTipoError("");
    try {
      const r = await api.createTipo(n);
      setTipos((prev) => (prev.includes(r.name) ? prev : [...prev, r.name]));
      setNewTipo("");
    } catch {
      setTipoError("No se pudo crear el tipo.");
    } finally {
      setTipoSaving(false);
    }
  }, [newTipo]);

  const handleRenameTipo = useCallback(
    async (old) => {
      const n = editTipoValue.trim();
      if (!n || n === old) {
        setEditingTipo(null);
        return;
      }
      try {
        const r = await api.renameTipo(old, n);
        setTipos((prev) => prev.map((t) => (t === old ? r.name : t)));
        setMolds((prev) => prev.map((m) => (m.tipo === old ? { ...m, tipo: r.name } : m)));
        setEditingTipo(null);
      } catch {
        setTipoError("No se pudo renombrar el tipo.");
      }
    },
    [editTipoValue]
  );

  const handleDeleteTipo = useCallback(async (name) => {
    try {
      await api.deleteTipo(name);
      setTipos((prev) => prev.filter((t) => t !== name));
      setMolds((prev) => prev.map((m) => (m.tipo === name ? { ...m, tipo: null } : m)));
    } catch {
      setTipoError("No se pudo eliminar el tipo.");
    }
  }, []);

  const openCreateMold = () => {
    setMoldForm({ name: "", tipo: tipos[0] || "", color: "#007AFF", ancho: "", alto: "" });
    setMoldError("");
    setCreatingMold(true);
    setEditingMold(null);
  };

  const openEditMold = (m) => {
    setMoldForm({
      name: m.name,
      tipo: tipos.includes(m.tipo) ? m.tipo : "",
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
      closeMoldForm();
    } catch {
      setMoldError("No se pudo guardar el molde. Inténtalo de nuevo.");
    } finally {
      setMoldSaving(false);
    }
  }, [moldForm]);

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
        <p className="mt-0.5 text-[13px] text-[#636366]">Catálogo de moldes de fabricación y sus tipos</p>

        {loading ? (
          <div className="flex justify-center py-16" data-testid="molds-loading">
            <Loader2 size={32} className="animate-spin text-[#1C1C1E]" />
          </div>
        ) : (
          <>
            <section className="mt-6" data-testid="tipos-section">
              <div className="flex items-center gap-1.5">
                <Shapes size={16} className="text-[#636366]" />
                <h2 className="text-xs font-bold uppercase tracking-wide text-[#636366]">Tipos de molde</h2>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2" data-testid="tipos-list">
                {tipos.map((t) =>
                  editingTipo === t ? (
                    <div key={t} className="flex h-9 items-center gap-1 rounded-full bg-[#F2F2F7] pl-3 pr-1" data-testid={`tipo-edit-${t}`}>
                      <input
                        autoFocus
                        value={editTipoValue}
                        onChange={(e) => setEditTipoValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRenameTipo(t)}
                        className="h-7 w-28 bg-transparent text-sm font-semibold text-[#111111] outline-none"
                        data-testid={`tipo-edit-input-${t}`}
                      />
                      <button onClick={() => handleRenameTipo(t)} data-testid={`tipo-edit-save-${t}`} className="rounded-full p-1 hover:bg-[#E5E5EA]">
                        <Check size={14} className="text-[#34C759]" />
                      </button>
                      <button onClick={() => setEditingTipo(null)} data-testid={`tipo-edit-cancel-${t}`} className="rounded-full p-1 hover:bg-[#E5E5EA]">
                        <X size={14} className="text-[#8E8E93]" />
                      </button>
                    </div>
                  ) : (
                    <div
                      key={t}
                      data-testid={`tipo-chip-${t}`}
                      className="flex h-9 items-center gap-1.5 rounded-full bg-[#F2F2F7] pl-3.5 pr-1.5 text-sm font-semibold text-[#111111]"
                    >
                      {t}
                      <button
                        data-testid={`tipo-rename-${t}`}
                        onClick={() => {
                          setEditingTipo(t);
                          setEditTipoValue(t);
                        }}
                        className="rounded-full p-1 hover:bg-[#E5E5EA]"
                      >
                        <Pencil size={12} className="text-[#8E8E93]" />
                      </button>
                      <button data-testid={`tipo-delete-${t}`} onClick={() => handleDeleteTipo(t)} className="rounded-full p-1 hover:bg-[#FFF0EE]">
                        <Trash2 size={12} className="text-[#FF3B30]" />
                      </button>
                    </div>
                  )
                )}
                <div className="flex h-9 items-center gap-1 rounded-full border border-dashed border-[#C7C7CC] pl-3 pr-1">
                  <input
                    data-testid="tipo-new-input"
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTipo()}
                    placeholder="Nuevo tipo..."
                    className="h-7 w-24 bg-transparent text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
                  />
                  <button
                    data-testid="tipo-new-create"
                    onClick={handleCreateTipo}
                    disabled={tipoSaving}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1C1C1E] text-white disabled:opacity-70"
                  >
                    {tipoSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
                  </button>
                </div>
              </div>
              {!!tipoError && (
                <p className="mt-1.5 text-xs text-[#FF3B30]" data-testid="tipo-error">
                  {tipoError}
                </p>
              )}
            </section>

            <section className="mt-7" data-testid="molds-section">
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
          </>
        )}
      </div>
    </div>
  );
}

function MoldForm({ form, setForm, tipos, saving, error, isNew, onCancel, onSave }) {
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
      <select
        data-testid="mold-form-tipo"
        value={form.tipo}
        onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
        className="h-10 rounded-lg bg-white px-3 text-sm text-[#111111] outline-none"
      >
        <option value="">Selecciona un tipo</option>
        {tipos.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
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

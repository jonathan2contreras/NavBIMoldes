import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";

import { api } from "../lib/api";

export const TipoPicker = ({ value, onChange, tipos, onTiposChange }) => {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState("");
  const boxRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
        setEditing(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleCreate = useCallback(async () => {
    const n = newName.trim();
    if (!n) return;
    try {
      const r = await api.createTipo(n);
      onTiposChange((prev) => (prev.includes(r.name) ? prev : [...prev, r.name]));
      onChange(r.name);
      setNewName("");
      setError("");
      setOpen(false);
    } catch {
      setError("No se pudo crear el tipo.");
    }
  }, [newName, onChange, onTiposChange]);

  const handleRename = useCallback(
    async (old) => {
      const n = editValue.trim();
      if (!n || n === old) {
        setEditing(null);
        return;
      }
      try {
        const r = await api.renameTipo(old, n);
        onTiposChange((prev) => prev.map((t) => (t === old ? r.name : t)));
        if (value === old) onChange(r.name);
        setEditing(null);
      } catch {
        setError("No se pudo renombrar el tipo.");
      }
    },
    [editValue, value, onChange, onTiposChange]
  );

  const handleDelete = useCallback(
    async (name) => {
      try {
        await api.deleteTipo(name);
        onTiposChange((prev) => prev.filter((t) => t !== name));
        if (value === name) onChange(null);
      } catch {
        setError("No se pudo eliminar el tipo.");
      }
    },
    [value, onChange, onTiposChange]
  );

  return (
    <div className="relative" ref={boxRef} data-testid="tipo-picker">
      <button
        type="button"
        data-testid="tipo-picker-trigger"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between rounded-xl bg-[#F2F2F7] px-3 text-sm font-semibold text-[#111111]"
      >
        <span className={value ? "" : "text-[#8E8E93]"}>{value || "Selecciona un tipo"}</span>
        <ChevronDown size={15} className="text-[#8E8E93]" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-[#E5E5EA] bg-white p-2 shadow-lg" data-testid="tipo-picker-dropdown">
          <div className="max-h-44 overflow-y-auto">
            {tipos.map((t) =>
              editing === t ? (
                <div key={t} className="flex items-center gap-1.5 px-1 py-1" data-testid={`tipo-picker-edit-${t}`}>
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRename(t)}
                    className="h-9 flex-1 rounded-lg bg-[#F2F2F7] px-2 text-sm text-[#111111] outline-none"
                    data-testid={`tipo-picker-edit-input-${t}`}
                  />
                  <button onClick={() => handleRename(t)} data-testid={`tipo-picker-edit-save-${t}`}>
                    <Check size={16} className="text-[#34C759]" />
                  </button>
                  <button onClick={() => setEditing(null)} data-testid={`tipo-picker-edit-cancel-${t}`}>
                    <X size={16} className="text-[#8E8E93]" />
                  </button>
                </div>
              ) : (
                <div
                  key={t}
                  data-testid={`tipo-picker-option-${t}`}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 hover:bg-[#F2F2F7]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(t);
                      setOpen(false);
                    }}
                    className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-[#111111]"
                  >
                    {t}
                  </button>
                  {t === value && <Check size={14} className="shrink-0 text-[#34C759]" />}
                  <button
                    data-testid={`tipo-picker-rename-${t}`}
                    onClick={() => {
                      setEditing(t);
                      setEditValue(t);
                    }}
                    className="shrink-0 rounded-full p-1 hover:bg-[#E5E5EA]"
                  >
                    <Pencil size={13} className="text-[#8E8E93]" />
                  </button>
                  <button
                    data-testid={`tipo-picker-delete-${t}`}
                    onClick={() => handleDelete(t)}
                    className="shrink-0 rounded-full p-1 hover:bg-[#FFF0EE]"
                  >
                    <Trash2 size={13} className="text-[#FF3B30]" />
                  </button>
                </div>
              )
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 border-t border-[#F2F2F7] pt-2">
            <input
              data-testid="tipo-picker-new-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Nuevo tipo..."
              className="h-9 flex-1 rounded-lg bg-[#F2F2F7] px-2.5 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
            />
            <button
              data-testid="tipo-picker-new-create"
              onClick={handleCreate}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1C1C1E] text-white"
            >
              <Plus size={15} />
            </button>
          </div>
          {!!error && (
            <p className="mt-1 text-xs text-[#FF3B30]" data-testid="tipo-picker-error">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

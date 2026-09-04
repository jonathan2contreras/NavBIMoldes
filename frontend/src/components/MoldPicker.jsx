import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Plus, X } from "lucide-react";

import { api } from "../lib/api";
import { TipoPicker } from "./TipoPicker";

export const MoldPicker = ({ value, onChange, disabled, molds, onMoldsChange }) => {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [tipos, setTipos] = useState([]);
  const [tipo, setTipo] = useState(null);
  const [color, setColor] = useState("#007AFF");
  const [ancho, setAncho] = useState("");
  const [alto, setAlto] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef(null);

  useEffect(() => {
    api
      .getTipos()
      .then((r) => {
        setTipos(r.items || []);
        setTipo((prev) => prev || (r.items || [])[0] || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = molds.find((m) => m.name === value) || null;

  const handleCreate = useCallback(async () => {
    const n = name.trim();
    if (!n) {
      setError("El nombre del molde es obligatorio.");
      return;
    }
    if (!tipo) {
      setError("Selecciona o crea un tipo de molde.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const mold = await api.saveMold({
        name: n,
        tipo,
        color,
        ancho: ancho === "" ? null : Number(ancho),
        alto: alto === "" ? null : Number(alto),
      });
      onMoldsChange((prev) => {
        const others = prev.filter((m) => m.name !== mold.name);
        return [...others, mold];
      });
      onChange(mold.name);
      setCreating(false);
      setName("");
      setAncho("");
      setAlto("");
      setOpen(false);
    } catch {
      setError("No se pudo crear el molde. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }, [name, tipo, color, ancho, alto, onChange, onMoldsChange]);

  return (
    <div className="relative" ref={boxRef} data-testid="mold-picker">
      <button
        type="button"
        data-testid="mold-picker-trigger"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-12 w-full items-center gap-2 rounded-xl border-[1.5px] border-[#E5E5EA] bg-white px-3.5 text-left text-sm font-semibold text-[#111111] transition-colors ${disabled ? "opacity-60" : "hover:border-[#C7C7CC]"}`}
      >
        {selected ? (
          <>
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />
            <span className="min-w-0 flex-1 truncate">
              {selected.name} <span className="text-xs font-medium text-[#8E8E93]">· {selected.tipo}</span>
              {selected.ancho && selected.alto && (
                <span className="text-xs font-medium text-[#8E8E93]"> · {selected.ancho}×{selected.alto}</span>
              )}
            </span>
          </>
        ) : (
          <span className="flex-1 text-[#8E8E93]">Sin molde asignado</span>
        )}
        <ChevronDown size={16} className="shrink-0 text-[#8E8E93]" />
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-[#E5E5EA] bg-white p-2 shadow-lg" data-testid="mold-picker-dropdown">
          <button
            type="button"
            data-testid="mold-picker-clear"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-[#8E8E93] hover:bg-[#F2F2F7]"
          >
            <span className="h-3 w-3 rounded-full border border-[#C7C7CC]" /> Sin molde
          </button>
          <div className="max-h-52 overflow-y-auto">
            {molds.map((m) => (
              <button
                key={m.name}
                type="button"
                data-testid={`mold-picker-option-${m.name}`}
                onClick={() => {
                  onChange(m.name);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-[#111111] hover:bg-[#F2F2F7]"
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                <span className="text-xs font-medium text-[#8E8E93]">
                  {m.tipo}
                  {m.ancho && m.alto ? ` · ${m.ancho}×${m.alto}` : ""}
                </span>
                {m.name === value && <Check size={14} className="shrink-0 text-[#34C759]" />}
              </button>
            ))}
          </div>

          <div className="mt-1 border-t border-[#F2F2F7] pt-2">
            {!creating ? (
              <button
                type="button"
                data-testid="mold-picker-new-toggle"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-sm font-bold text-[#007AFF] hover:bg-[#F2F2F7]"
              >
                <Plus size={15} /> Crear nuevo molde
              </button>
            ) : (
              <div className="flex flex-col gap-2 p-1" data-testid="mold-picker-new-form">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#636366]">Nuevo molde</p>
                  <button type="button" onClick={() => setCreating(false)} data-testid="mold-picker-new-cancel">
                    <X size={15} className="text-[#8E8E93]" />
                  </button>
                </div>
                <input
                  data-testid="mold-picker-new-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del molde (ej. M-01)"
                  className="h-10 rounded-lg bg-[#F2F2F7] px-3 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
                />
                <p className="text-xs font-semibold text-[#636366]">Tipo de molde</p>
                <TipoPicker value={tipo} onChange={setTipo} tipos={tipos} onTiposChange={setTipos} />
                <p className="mt-1 text-xs font-semibold text-[#636366]">Medidas (ancho × alto)</p>
                <div className="flex items-center gap-2">
                  <input
                    data-testid="mold-picker-new-ancho"
                    type="number"
                    step="0.01"
                    value={ancho}
                    onChange={(e) => setAncho(e.target.value)}
                    placeholder="Ancho (m)"
                    className="h-10 flex-1 rounded-lg bg-[#F2F2F7] px-3 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
                  />
                  <span className="text-[#8E8E93]">×</span>
                  <input
                    data-testid="mold-picker-new-alto"
                    type="number"
                    step="0.01"
                    value={alto}
                    onChange={(e) => setAlto(e.target.value)}
                    placeholder="Alto (m)"
                    className="h-10 flex-1 rounded-lg bg-[#F2F2F7] px-3 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    data-testid="mold-picker-new-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-[#E5E5EA]"
                  />
                  <span className="text-xs font-medium text-[#8E8E93]">Color para etiquetar el panel (visor 3D)</span>
                </div>
                {!!error && (
                  <p className="text-xs text-[#FF3B30]" data-testid="mold-picker-new-error">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  data-testid="mold-picker-new-save"
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex h-10 items-center justify-center rounded-lg bg-[#1C1C1E] text-sm font-bold text-white disabled:opacity-70"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : "Crear y usar"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

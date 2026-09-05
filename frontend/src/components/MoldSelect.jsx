import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export const MoldSelect = ({ value, onChange, disabled, molds }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = molds.find((m) => m.name === value) || null;

  return (
    <div className="relative" ref={boxRef} data-testid="mold-select">
      <button
        type="button"
        data-testid="mold-select-trigger"
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
        <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-[#E5E5EA] bg-white p-2 shadow-lg" data-testid="mold-select-dropdown">
          <button
            type="button"
            data-testid="mold-select-clear"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-[#8E8E93] hover:bg-[#F2F2F7]"
          >
            <span className="h-3 w-3 rounded-full border border-[#C7C7CC]" /> Sin molde
          </button>
          <div className="max-h-52 overflow-y-auto">
            {molds.length === 0 ? (
              <p className="px-2.5 py-3 text-center text-xs text-[#8E8E93]" data-testid="mold-select-empty">
                No hay moldes creados. Ve a Moldes en el menú superior.
              </p>
            ) : (
              molds.map((m) => (
                <button
                  key={m.name}
                  type="button"
                  data-testid={`mold-select-option-${m.name}`}
                  onClick={() => {
                    onChange(m.name);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-[#111111] hover:bg-[#F2F2F7]"
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  <span className="shrink-0 text-xs font-medium text-[#8E8E93]">
                    {m.tipo}
                    {m.ancho && m.alto ? ` · ${m.ancho}×${m.alto}` : ""}
                  </span>
                  {m.name === value && <Check size={14} className="shrink-0 text-[#34C759]" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

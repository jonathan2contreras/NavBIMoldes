import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, ChevronRight, Eye, Loader2, Lock, Wrench } from "lucide-react";

import { api } from "../lib/api";
import { useRole } from "../context/RoleContext";
import { LOGOS } from "../lib/theme";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setRole } = useRole();
  const [choosing, setChoosing] = useState("");
  const [askPassword, setAskPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const enterViewer = () => {
    setChoosing("viewer");
    setRole("viewer");
    navigate("/", { replace: true });
  };

  const submitAdmin = async () => {
    if (!password.trim()) {
      setError("Introduce la contraseña.");
      return;
    }
    setChoosing("admin");
    setError("");
    try {
      const res = await api.verifyAdmin(password);
      if (res.ok) {
        setRole("admin", res.token);
        navigate("/", { replace: true });
      } else {
        setError(res.message || "Contraseña de administrador incorrecta.");
        setChoosing("");
      }
    } catch {
      setError("No se pudo verificar la contraseña. Inténtalo de nuevo.");
      setChoosing("");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white" data-testid="login-screen">
      <div className="flex flex-1 flex-col px-6 pt-12 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1C1C1E]">
            <Box size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold text-[#111111]">BIMTracker</h1>
            <p className="mt-0.5 text-[13px] text-[#636366]">Seguimiento de paneles de fachada — NAB 3D</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8" data-testid="login-logos">
          {LOGOS.map((l) => (
            <img
              key={l.key}
              src={l.src}
              alt={l.key}
              data-testid={`login-logo-${l.key}`}
              className="h-[72px] max-w-[85%] object-contain"
              style={{ aspectRatio: l.ratio }}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3 pb-10">
          {!askPassword ? (
            <>
              <p className="mb-1 text-xs font-bold tracking-widest text-[#8E8E93]">¿CÓMO QUIERES ENTRAR?</p>
              <button
                data-testid="role-admin-button"
                onClick={() => {
                  setError("");
                  setPassword("");
                  setAskPassword(true);
                }}
                disabled={!!choosing}
                className="flex items-center gap-3 rounded-2xl bg-[#1C1C1E] p-4 text-left transition-opacity hover:opacity-90"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  <Wrench size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-white">Administrador</p>
                  <p className="mt-0.5 text-xs text-white/75">Requiere contraseña · todas las funciones activas</p>
                </div>
                <Lock size={18} className="text-white/70" />
              </button>
              <button
                data-testid="role-viewer-button"
                onClick={enterViewer}
                disabled={!!choosing}
                className="flex items-center gap-3 rounded-2xl border border-[#E5E5EA] bg-white p-4 text-left transition-colors hover:bg-[#F2F2F7]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F2F2F7]">
                  <Eye size={22} className="text-[#111111]" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-[#111111]">Usuario</p>
                  <p className="mt-0.5 text-xs text-[#8E8E93]">
                    Solo visualización: no puede editar etiquetas ni observaciones
                  </p>
                </div>
                {choosing === "viewer" ? (
                  <Loader2 size={18} className="animate-spin text-[#1C1C1E]" />
                ) : (
                  <ChevronRight size={18} className="text-[#C7C7CC]" />
                )}
              </button>
            </>
          ) : (
            <>
              <p className="mb-1 text-xs font-bold tracking-widest text-[#8E8E93]">CONTRASEÑA DE ADMINISTRADOR</p>
              <div className="flex h-[50px] items-center gap-2 rounded-xl bg-[#F2F2F7] px-3">
                <Lock size={18} className="text-[#8E8E93]" />
                <input
                  data-testid="admin-password-input"
                  type="password"
                  value={password}
                  autoFocus
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && submitAdmin()}
                  placeholder="Introduce la contraseña"
                  className="h-full flex-1 bg-transparent text-[15px] text-[#111111] outline-none placeholder:text-[#8E8E93]"
                />
              </div>
              {!!error && (
                <p className="text-[13px] font-medium text-[#FF3B30]" data-testid="admin-password-error">
                  {error}
                </p>
              )}
              <button
                data-testid="admin-password-submit"
                onClick={submitAdmin}
                disabled={choosing === "admin"}
                className="flex h-[50px] items-center justify-center rounded-xl bg-[#1C1C1E] text-base font-bold text-white transition-opacity hover:opacity-90"
              >
                {choosing === "admin" ? <Loader2 size={18} className="animate-spin" /> : "Acceder"}
              </button>
              <button
                data-testid="admin-password-cancel"
                onClick={() => {
                  setAskPassword(false);
                  setError("");
                  setChoosing("");
                }}
                className="py-2 text-sm font-semibold text-[#8E8E93]"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

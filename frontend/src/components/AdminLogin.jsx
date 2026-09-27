import React, { useState } from "react";
import { Lock, LogOut } from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const navButton = "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-semibold text-[#3A3A3C] hover:bg-[#F2F2F7]";

export default function AdminLogin() {
  const { isAdmin, login, logout } = useRole();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAdmin) {
    return (
      <button type="button" onClick={logout} className={navButton} title="Salir del modo edición" data-testid="admin-logout">
        <LogOut size={15} /> Salir
      </button>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(password);
      setOpen(false);
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={navButton} title="Iniciar sesión para editar" data-testid="admin-login">
        <Lock size={15} /> Iniciar sesión
      </button>
      <Dialog open={open} onOpenChange={(next) => { if (!busy) { setOpen(next); setError(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Iniciar sesión</DialogTitle>
              <DialogDescription>Introduce la contraseña de administrador para poder editar.</DialogDescription>
            </DialogHeader>
            <Input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña" aria-label="Contraseña" data-testid="admin-password" />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={busy || !password} data-testid="admin-submit">
                {busy ? "Entrando…" : "Entrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

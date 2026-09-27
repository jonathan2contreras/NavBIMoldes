import React, { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export default function BackupControls() {
  const { isAdmin } = useRole();
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const download = async () => {
    setBusy(true);
    setMessage("");
    try {
      await api.downloadBackup();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    setMessage("");
    try {
      await api.restoreBackup(selectedFile);
      setSelectedFile(null);
      window.location.reload();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (busy) return;
    setSelectedFile(null);
    setMessage("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="ml-auto flex shrink-0 items-center gap-1 border-l border-[#E5E5EA] pl-2 sm:pl-3">
      <button type="button" onClick={download} disabled={busy}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-semibold text-[#3A3A3C] hover:bg-[#F2F2F7] disabled:opacity-50"
        title="Descargar copia de todos los datos" data-testid="backup-download">
        <Download size={15} /> Copia de seguridad
      </button>
      {isAdmin && (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-semibold text-[#3A3A3C] hover:bg-[#F2F2F7] disabled:opacity-50"
          title="Restaurar copia local" data-testid="backup-restore">
          <Upload size={15} /> Restaurar
        </button>
      )}
      <input ref={inputRef} type="file" accept=".json,application/json" className="hidden"
        aria-label="Seleccionar copia de seguridad" onChange={(event) => {
          setMessage("");
          setSelectedFile(event.target.files?.[0] || null);
        }} />
      {message && !selectedFile && <span role="alert" className="max-w-48 text-xs text-red-600">{message}</span>}
      <AlertDialog open={!!selectedFile} onOpenChange={(open) => { if (!open) close(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reemplazar todos los datos?</AlertDialogTitle>
            <AlertDialogDescription>
              Se restaurarán las colecciones, configuraciones y archivos adjuntos de «{selectedFile?.name}».
              Se eliminarán los datos actuales. Esta acción no se puede deshacer; descarga una copia antes de continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} onClick={close}>Cancelar</AlertDialogCancel>
            <button type="button" onClick={restore} disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {busy ? "Restaurando…" : "Sí, reemplazar todo"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

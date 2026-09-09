import React, { useEffect, useState } from "react";
import { Layers, Loader2, Pencil, RefreshCw, Save } from "lucide-react";
import { useRole } from "../context/RoleContext";
import { useProjectPanels } from "../context/ProjectPanelsContext";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

export const ProjectPanelTotal = () => {
  const { isAdmin } = useRole();
  const { project, error, refresh, save, editorOpen, setEditorOpen } = useProjectPanels();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (editorOpen) {
      setValue(String(project?.total_panels ?? ""));
      setFormError("");
      setSaved(false);
      refresh();
    }
    // Refreshes must not overwrite an unsaved draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorOpen]);
  const submit = async (event) => {
    event.preventDefault();
    setFormError("");
    const total = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(total) || total > 2147483647) {
      setFormError("Introduce un número entero entre 0 y 2.147.483.647."); return;
    }
    if (total < project.assigned_panels) {
      setFormError(`El total no puede ser inferior a los ${project.assigned_panels} paneles ya asignados.`); return;
    }
    setSaving(true);
    try { await save(total); setSaved(true); setEditorOpen(false); }
    catch (err) { setFormError(err.message || "No se pudo guardar el total."); }
    finally { setSaving(false); }
  };
  return <>
    <div className="ml-auto flex max-w-full flex-wrap items-center gap-1.5 rounded-lg bg-[#F2F2F7] px-2.5 py-1.5" data-testid="project-total-control">
      <Layers size={13} className="shrink-0 text-[#636366]" />
      <span className="text-[11px] text-[#636366]">Total proyecto</span>
      <span className="break-all text-xs font-bold tabular-nums" data-testid="project-total-value">{project ? project.total_panels.toLocaleString("es-ES") : "—"}</span>
      {isAdmin && <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="project-total-edit" aria-label="Editar total de paneles del proyecto" title="Editar total de paneles" disabled={!project} onClick={() => setEditorOpen(true)}><Pencil /></Button>}
      {error && <Button variant="ghost" size="icon" className="h-7 w-7 text-red-700" data-testid="project-total-retry" onClick={refresh} title={error} aria-label={error}><RefreshCw /></Button>}
      {saved && <span className="text-[11px] font-semibold text-green-700" role="status" data-testid="project-total-saved">Guardado</span>}
    </div>
    <Dialog open={editorOpen && isAdmin} onOpenChange={(open) => { if (!saving) setEditorOpen(open); }}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-md rounded-lg" closeTestId="project-total-close" overlayTestId="project-total-overlay" data-testid="project-total-dialog">
        <DialogHeader className="text-left">
          <DialogTitle className="pr-5 tracking-normal" data-testid="project-total-dialog-title">Total de paneles del proyecto</DialogTitle>
          <DialogDescription data-testid="project-total-dialog-description">Cantidad de referencia del proyecto</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-5" data-testid="project-total-form">
          <div><label htmlFor="project-total-input" className="mb-2 block text-sm font-semibold">Total de paneles</label>
            <input id="project-total-input" data-testid="project-total-input" type="number" inputMode="numeric" step="1" min={project?.assigned_panels ?? 0} max="2147483647" value={value} disabled={saving} autoFocus
              onChange={(e) => { setValue(e.target.value); setFormError(""); }} className="h-12 w-full rounded-lg border border-[#C7C7CC] px-3 text-xl font-bold outline-[#007AFF]" />
          </div>
          <div className="space-y-2 text-xs text-[#636366]">
            <p data-testid="project-total-assigned">Paneles ya asignados: <strong>{project?.assigned_panels.toLocaleString("es-ES")}</strong></p>
            <p data-testid="project-total-model">Paneles en el modelo 3D: <strong>{project?.model_panels.toLocaleString("es-ES")}</strong></p>
            {project?.updated_at && <p data-testid="project-total-last-change">Último cambio: {new Date(project.updated_at).toLocaleString("es-ES")}</p>}
          </div>
          {formError && <p className="text-sm text-red-700" role="alert" data-testid="project-total-error">{formError}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" data-testid="project-total-cancel" disabled={saving} onClick={() => setEditorOpen(false)}>Cancelar</Button><Button type="submit" data-testid="project-total-save" disabled={saving || !project}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Guardar total</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
};
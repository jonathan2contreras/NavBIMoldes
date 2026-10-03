const BASE = process.env.REACT_APP_BACKEND_URL;

export const BACKEND_URL = BASE;
export const VIEWER_URL = `${BASE}/api/viewer`;

const TOKEN_KEY = "nabimoldes_admin_token";
export const getAdminToken = () => localStorage.getItem(TOKEN_KEY);
export const setAdminToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearAdminToken = () => localStorage.removeItem(TOKEN_KEY);
const authHeaders = () => (getAdminToken() ? { Authorization: `Bearer ${getAdminToken()}` } : {});

async function req(path, opts = {}) {
  const r = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(opts.headers || {}) },
  });
  if (r.status === 401 && getAdminToken()) {
    // Expired or invalid session: drop it so the UI returns to view-only mode.
    clearAdminToken();
    window.dispatchEvent(new Event("admin-logout"));
  }
  if (!r.ok) {
    const body = await r.json().catch(() => null);
    let message = typeof body?.detail === "string" ? body.detail : `Error de solicitud (${r.status}).`;
    if (Array.isArray(body?.detail)) {
      const issue = body.detail[0];
      const field = issue?.loc?.[issue.loc.length - 1];
      const labels = { date: "la fecha de fabricación", start_date: "la fecha de inicio", daily_capacity: "la capacidad diaria", revision: "la versión del cronograma", total_panels: "el total de paneles" };
      message = `Revisa ${labels[field] || "los datos introducidos"}.`;
      if (issue?.type?.startsWith("date")) message += " Introduce una fecha válida.";
      if (issue?.type?.startsWith("int")) message += " Debe ser un número entero.";
      if (issue?.type === "missing") message += " Este dato es obligatorio.";
      if (issue?.ctx?.ge !== undefined) message += ` El mínimo es ${issue.ctx.ge}.`;
      if (issue?.ctx?.le !== undefined) message += ` El máximo es ${issue.ctx.le}.`;
    }
    const error = new Error(message);
    error.status = r.status;
    throw error;
  }
  return r.json();
}

export const fileUrl = (path) => `${BASE}/api/files/${path}`;

export const api = {
  downloadBackup: async () => {
    const response = await fetch(`${BASE}/api/backup`);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.detail || "No se pudo crear la copia de seguridad.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const match = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "");
    link.download = match ? match[1] : "NABIMOLDES_Copia.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
  restoreBackup: async (file) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${BASE}/api/backup`, { method: "POST", body: form, headers: authHeaders() });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.detail || "No se pudo restaurar la copia de seguridad.");
    }
    return response.json();
  },
  login: (password) => req("/auth/login", { method: "POST", body: JSON.stringify({ password }) }),
  me: () => req("/auth/me"),
  getSchedule: () => req("/schedule"),
  generateSchedule: (body) => req("/schedule/generate", { method: "POST", body: JSON.stringify(body) }),
  saveSchedule: (revision) => req("/schedule/save", { method: "POST", body: JSON.stringify({ revision }) }),
  fillSchedule: (revision) => req("/schedule/fill", { method: "POST", body: JSON.stringify({ revision }) }),
  moveSchedulePanel: (body) => req("/schedule/panel", { method: "PATCH", body: JSON.stringify(body) }),
  setScheduleMoldCopies: (body) => req("/schedule/mold-copies", { method: "PATCH", body: JSON.stringify(body) }),
  getPhases: () => req("/phases"),
  resetPhases: () => req("/phases", { method: "DELETE" }),
  movePhaseWeek: (body) => req("/phases/week", { method: "PATCH", body: JSON.stringify(body) }),
  createFront: (name) => req("/phases/fronts", { method: "POST", body: JSON.stringify({ name }) }),
  deleteFront: (id) => req(`/phases/fronts/${encodeURIComponent(id)}`, { method: "DELETE" }),
  assignPhase: (body) => req("/phases/assign", { method: "POST", body: JSON.stringify(body) }),
  unassignPhase: (object_names) => req("/phases/unassign", { method: "POST", body: JSON.stringify({ object_names }) }),
  getProjectPanels: () => req("/project/panels"),
  saveProjectPanels: (total_panels) => req("/project/panels", { method: "PUT", body: JSON.stringify({ total_panels }) }),
  uploadPhoto: async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${BASE}/api/upload`, { method: "POST", body: fd, headers: authHeaders() });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  uploadPdf: async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${BASE}/api/upload/pdf`, { method: "POST", body: fd, headers: authHeaders() });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  getObjects: (p) =>
    req(
      `/objects?search=${encodeURIComponent(p.search || "")}&molde=${encodeURIComponent(p.molde || "all")}&facade=${p.facade || "all"}&skip=${p.skip || 0}&limit=${p.limit || 50}`
    ),
  getObject: (name) => req(`/object?name=${encodeURIComponent(name)}`),
  getObjectNames: (facade, molde) =>
    req(`/objects/names?facade=${facade || "all"}&molde=${encodeURIComponent(molde || "all")}`),
  getObjectMesh: (name) => req(`/object/mesh?name=${encodeURIComponent(name)}`),
  getTags: () => req("/tags"),
  saveTag: (body) => req("/tags", { method: "PUT", body: JSON.stringify(body) }),
  bulkSaveTags: (body) => req("/tags/bulk", { method: "PUT", body: JSON.stringify(body) }),
  deleteTag: (objectName) => req(`/tags?object_name=${encodeURIComponent(objectName)}`, { method: "DELETE" }),
  getMolds: () => req("/molds"),
  saveMold: (body) => req("/molds", { method: "POST", body: JSON.stringify(body) }),
  deleteMold: (name) => req(`/molds/${encodeURIComponent(name)}`, { method: "DELETE" }),
  getTipos: () => req("/tipos"),
  createTipo: (name) => req("/tipos", { method: "POST", body: JSON.stringify({ name }) }),
  renameTipo: (name, newName) =>
    req(`/tipos/${encodeURIComponent(name)}`, { method: "PUT", body: JSON.stringify({ name: newName }) }),
  deleteTipo: (name) => req(`/tipos/${encodeURIComponent(name)}`, { method: "DELETE" }),
  getMoldsReport: (facade, molde, tipo) =>
    req(`/report/molds?facade=${facade || "all"}&molde=${encodeURIComponent(molde || "all")}&tipo=${encodeURIComponent(tipo || "all")}`),
  getPhotos: (p) =>
    req(`/photos?facade=${p.facade || "all"}&from=${p.from || ""}&to=${p.to || ""}`),
  deletePhoto: (objectName, photo) =>
    req(`/photos?object_name=${encodeURIComponent(objectName)}&photo=${encodeURIComponent(photo)}`, { method: "DELETE" }),
};

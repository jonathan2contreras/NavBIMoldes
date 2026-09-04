const BASE = process.env.REACT_APP_BACKEND_URL;

export const BACKEND_URL = BASE;
export const VIEWER_URL = `${BASE}/api/viewer`;

async function req(path, opts) {
  const r = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export const fileUrl = (path) => `${BASE}/api/files/${path}`;

export const api = {
  uploadPhoto: async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${BASE}/api/upload`, { method: "POST", body: fd });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  getObjects: (p) =>
    req(
      `/objects?search=${encodeURIComponent(p.search || "")}&status=${p.status || "all"}&facade=${p.facade || "all"}&skip=${p.skip || 0}&limit=${p.limit || 50}`
    ),
  getObject: (name) => req(`/object?name=${encodeURIComponent(name)}`),
  getObjectMesh: (name) => req(`/object/mesh?name=${encodeURIComponent(name)}`),
  getTags: () => req("/tags"),
  saveTag: (body) => req("/tags", { method: "PUT", body: JSON.stringify(body) }),
  getStats: () => req("/stats"),
  getReport: (p) =>
    req(`/report?from=${p.from}&to=${p.to}&status=${p.status || "all"}&facade=${p.facade || "all"}`),
  getPhotos: (p) =>
    req(`/photos?facade=${p.facade || "all"}&from=${p.from || ""}&to=${p.to || ""}`),
  deletePhoto: (objectName, photo) =>
    req(`/photos?object_name=${encodeURIComponent(objectName)}&photo=${encodeURIComponent(photo)}`, { method: "DELETE" }),
  verifyAdmin: (password) =>
    req("/admin/verify", { method: "POST", body: JSON.stringify({ password }) }),
};

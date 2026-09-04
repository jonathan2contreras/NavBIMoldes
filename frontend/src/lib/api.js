const BASE = process.env.REACT_APP_BACKEND_URL;

export const BACKEND_URL = BASE;
export const VIEWER_URL = `${BASE}/api/viewer`;

const authHeaders = () => {
  const token = localStorage.getItem("bim_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleUnauthorized = () => {
  localStorage.removeItem("bim_role");
  localStorage.removeItem("bim_token");
  if (window.location.pathname !== "/login") window.location.assign("/login");
};

async function req(path, opts = {}) {
  const r = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(opts.headers || {}) },
  });
  if (r.status === 401) {
    handleUnauthorized();
    throw new Error("HTTP 401");
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export const fileUrl = (path) => `${BASE}/api/files/${path}`;

export const api = {
  uploadPhoto: async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${BASE}/api/upload`, { method: "POST", body: fd, headers: authHeaders() });
    if (r.status === 401) {
      handleUnauthorized();
      throw new Error("HTTP 401");
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  getObjects: (p) =>
    req(
      `/objects?search=${encodeURIComponent(p.search || "")}&molde=${encodeURIComponent(p.molde || "all")}&facade=${p.facade || "all"}&skip=${p.skip || 0}&limit=${p.limit || 50}`
    ),
  getObject: (name) => req(`/object?name=${encodeURIComponent(name)}`),
  getObjectMesh: (name) => req(`/object/mesh?name=${encodeURIComponent(name)}`),
  getTags: () => req("/tags"),
  saveTag: (body) => req("/tags", { method: "PUT", body: JSON.stringify(body) }),
  bulkSaveTags: (body) => req("/tags/bulk", { method: "PUT", body: JSON.stringify(body) }),
  deleteTag: (objectName) => req(`/tags?object_name=${encodeURIComponent(objectName)}`, { method: "DELETE" }),
  getMolds: () => req("/molds"),
  saveMold: (body) => req("/molds", { method: "POST", body: JSON.stringify(body) }),
  deleteMold: (name) => req(`/molds/${encodeURIComponent(name)}`, { method: "DELETE" }),
  getMoldsReport: (facade) => req(`/report/molds?facade=${facade || "all"}`),
  getPhotos: (p) =>
    req(`/photos?facade=${p.facade || "all"}&from=${p.from || ""}&to=${p.to || ""}`),
  deletePhoto: (objectName, photo) =>
    req(`/photos?object_name=${encodeURIComponent(objectName)}&photo=${encodeURIComponent(photo)}`, { method: "DELETE" }),
  verifyAdmin: (password) =>
    req("/admin/verify", { method: "POST", body: JSON.stringify({ password }) }),
};

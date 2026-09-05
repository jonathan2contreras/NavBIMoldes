export const NO_MOLDE_COLOR = "#B4BAC6";

export function tipoLabel(tipo) {
  return tipo || "";
}

export const FACADE_LABELS = { norte: "Norte", sur: "Sur", este: "Este", oeste: "Oeste" };

export const FACADE_FILTERS = [
  { key: "all", label: "Todas las fachadas" },
  { key: "norte", label: "Norte" },
  { key: "sur", label: "Sur" },
  { key: "este", label: "Este" },
  { key: "oeste", label: "Oeste" },
];

export const LOGOS = [
  { key: "fiberkret", src: "/logo_fiberkret.png", ratio: 1032 / 290 },
  { key: "entrepisos", src: "/logo_entrepisos.png", ratio: 1020 / 411 },
  { key: "grcontreras", src: "/logo_grcontreras.png", ratio: 1340 / 542 },
];

export function displayName(name) {
  if (!name) return name;
  const parts = name.split(" ");
  if (parts.length >= 2 && parts[0] === parts[1]) parts.splice(1, 1);
  return parts.join(" ");
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function dimParts(d) {
  if (!d || d.length < 3) return null;
  let w = Math.max(d[0], d[2]);
  let h = d[1];
  if (w > 100 || h > 100) {
    w /= 1000;
    h /= 1000;
  }
  return { w, h };
}

export function formatArea(d) {
  const p = dimParts(d);
  return p ? `${(p.w * p.h).toFixed(2)} m²` : "";
}

export function formatDims(d) {
  const p = dimParts(d);
  return p ? `${p.w.toFixed(2)} × ${p.h.toFixed(2)} m` : "";
}

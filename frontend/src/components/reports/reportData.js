export const number = (value) => value.toLocaleString("es-ES");
export const percent = (count, total) => total ? (count / total * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 }) : "0";
export const testKey = (value) => encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16)}`);
const byName = (a, b) => a.localeCompare(b, "es", { numeric: true });

export const getMoldRows = (data, catalog, molde, tipo, sort) => {
  const rows = new Map();
  if (molde !== "__none__") catalog.forEach((mold) => {
    if (molde !== "all" && molde !== mold.name) return;
    if (tipo === "__none__" ? !!mold.tipo : tipo !== "all" && tipo !== mold.tipo) return;
    rows.set(mold.name, { molde: mold.name, tipo: mold.tipo, color: mold.color, count: 0 });
  });
  data.resumen.forEach((row) => rows.set(row.molde, row));
  return [...rows.values()].sort((a, b) => (sort === "count" ? b.count - a.count : 0) || byName(a.molde, b.molde));
};

const TYPE_COLORS = ["#007AFF", "#169873", "#D98216", "#C84E65", "#637680", "#4D8637"];
export const groupByType = (rows, tipos) => {
  const groups = new Map();
  const names = [...new Set([...tipos, ...rows.map((row) => row.tipo).filter(Boolean)])].sort(byName);
  rows.forEach((row) => {
    const key = row.tipo || "__none__";
    if (!groups.has(key)) groups.set(key, { key, name: row.tipo || "Sin tipo", count: 0, rows: [],
      color: row.tipo ? TYPE_COLORS[names.indexOf(row.tipo) % TYPE_COLORS.length] : "#637680" });
    const group = groups.get(key);
    group.count += row.count;
    group.rows.push(row);
  });
  return [...groups.values()].sort((a, b) => b.count - a.count || byName(a.name, b.name));
};
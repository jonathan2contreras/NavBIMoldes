import { shiftDay } from "./dates";

export const dayDiff = (later, earlier) => Math.round((Date.parse(later) - Date.parse(earlier)) / 86400000);
const weekday = (value) => new Date(`${value}T00:00:00`).getDay();
const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

/**
 * Ventana de fabricación y fecha límite de operatividad por molde.
 * La fecha límite es el primer día en que se fabrica un panel de ese molde.
 */
export const buildReadiness = (data) => {
  const byMold = new Map();
  data.panels.forEach((p) => {
    if (!p.date) return;
    const row = byMold.get(p.molde) || { name: p.molde, first: p.date, last: p.date, panels: 0, area: 0, days: new Set() };
    if (p.date < row.first) row.first = p.date;
    if (p.date > row.last) row.last = p.date;
    row.days.add(p.date);
    row.panels += 1;
    row.area += p.area || 0;
    byMold.set(p.molde, row);
  });
  const catalog = new Map(data.molds.map((m) => [m.name, m]));
  const rows = [...byMold.values()]
    .map((r) => ({ ...r, dayCount: r.days.size, mold: catalog.get(r.name) }))
    .sort((a, b) => a.first.localeCompare(b.first) || a.name.localeCompare(b.name, "es", { numeric: true }));
  const pending = data.molds.filter((m) => !byMold.has(m.name));
  if (!rows.length) return { rows: [], pending, start: null, total: 1, ticks: [], today: null };
  const first = rows[0].first;
  const start = first < data.start_date ? first : data.start_date;
  const end = rows.reduce((max, r) => (r.last > max ? r.last : max), rows[0].last);
  const total = dayDiff(end, start) + 1;
  const ticks = [];
  for (let d = 0; d < total; d += 1) {
    const date = shiftDay(start, d);
    if (weekday(date) === 1) ticks.push({ date, left: (d / total) * 100 });
  }
  const today = todayIso();
  return { rows, pending, start, total, ticks, today: today >= start && today <= end ? today : null };
};

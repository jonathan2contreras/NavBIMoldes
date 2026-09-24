import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

export const weekMonday = (iso) => format(startOfWeek(parseISO(iso), { weekStartsOn: 1 }), "yyyy-MM-dd");
export const weekLabel = (monday) =>
  `${format(parseISO(monday), "d MMM", { locale: es })} – ${format(addDays(parseISO(monday), 5), "d MMM yyyy", { locale: es })}`;

// Lighten a #rrggbb color toward white by `amount` (0–1).
const tint = (hex, amount) => {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, "0");
  return `#${mix(n >> 16)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
};

/** Groups the ordered list into fronts → weeks, keeping selection order inside each week. */
export const groupPhases = (plan) =>
  plan.fronts.map((front) => {
    const items = plan.items.map((item, order) => ({ ...item, order })).filter((i) => i.front_id === front.id);
    const weeks = [...new Set(items.map((i) => i.week))].sort();
    return { ...front, weeks: weeks.map((week, index) => ({ week, index, items: items.filter((i) => i.week === week) })) };
  });

/** {object_name: {color, label}} for the 3D layer: front color, lighter for each later week. */
export const phaseLayerMap = (plan) => {
  const map = {};
  groupPhases(plan).forEach((front) =>
    front.weeks.forEach(({ week, index, items }) =>
      items.forEach((i) => {
        map[i.object_name] = { color: tint(front.color, Math.min(index * 0.22, 0.66)), label: `${front.name} · Sem. ${weekLabel(week)}` };
      })
    )
  );
  return map;
};

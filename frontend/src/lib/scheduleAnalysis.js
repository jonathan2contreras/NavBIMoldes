import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

export const STATUS = ["advance", "week", "late", "unscheduled"];
const emptyCounts = () => Object.fromEntries(STATUS.map((status) => [status, 0]));

/** Compare forecast fabrication dates with the installation Monday–Saturday window. */
export function analyzeSchedule(plan, schedule) {
  const fronts = new Map(plan.fronts.map((front) => [front.id, front]));
  const panels = new Map(schedule.panels.map((panel) => [panel.object_name, panel]));
  const groups = new Map();
  const totals = emptyCounts();
  const items = [];

  for (const assignment of plan.items) {
    const front = fronts.get(assignment.front_id);
    if (!front) continue;
    const panel = panels.get(assignment.object_name);
    const date = panel?.date || null;
    const end = format(addDays(parseISO(assignment.week), 5), "yyyy-MM-dd");
    const status = !date ? "unscheduled" : date < assignment.week ? "advance" : date <= end ? "week" : "late";
    const delay = status === "late" ? differenceInCalendarDays(parseISO(date), parseISO(end)) : 0;
    const item = { ...assignment, front: front.name, color: front.color, code: panel?.code || assignment.object_name,
      mold: panel?.molde || "—", date, status, delay };
    items.push(item);
    totals[status]++;
    const key = `${assignment.front_id}|${assignment.week}`;
    if (!groups.has(key)) groups.set(key, { key, front: front.name, color: front.color, week: assignment.week,
      end, total: 0, counts: emptyCounts() });
    const group = groups.get(key);
    group.total++;
    group.counts[status]++;
  }
  return { totals, total: items.length, groups: [...groups.values()].sort((a, b) => a.week.localeCompare(b.week) || a.front.localeCompare(b.front, "es")),
    issues: items.filter((item) => item.status === "late" || item.status === "unscheduled")
      .sort((a, b) => a.week.localeCompare(b.week) || (b.delay - a.delay)) };
}

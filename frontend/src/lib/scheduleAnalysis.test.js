import { analyzeSchedule } from "./scheduleAnalysis";

const plan = { fronts: [{ id: "n", name: "Norte", color: "#123456" }], items: [
  { object_name: "before", front_id: "n", week: "2027-02-15" },
  { object_name: "monday", front_id: "n", week: "2027-02-15" },
  { object_name: "saturday", front_id: "n", week: "2027-02-15" },
  { object_name: "late", front_id: "n", week: "2027-02-15" },
  { object_name: "missing", front_id: "n", week: "2027-02-15" },
  { object_name: "next", front_id: "n", week: "2027-02-22" },
] };

it("crosses the installation list with fabrication dates, inclusive through Saturday", () => {
  const schedule = { panels: [
    { object_name: "before", date: "2027-02-14" },
    { object_name: "monday", date: "2027-02-15" },
    { object_name: "saturday", date: "2027-02-20" },
    { object_name: "late", date: "2027-02-22" },
    { object_name: "next", date: null },
    { object_name: "outside", date: "2027-02-15" },
  ] };
  const result = analyzeSchedule(plan, schedule);
  expect(result.total).toBe(6);
  expect(result.totals).toEqual({ advance: 1, week: 2, late: 1, unscheduled: 2 });
  expect(result.groups.map((g) => [g.week, g.total, g.counts.late])).toEqual([
    ["2027-02-15", 5, 1], ["2027-02-22", 1, 0],
  ]);
  expect(result.issues.find((item) => item.object_name === "late").delay).toBe(2);
  expect(result.issues.find((item) => item.object_name === "missing").status).toBe("unscheduled");
});

it("handles empty plans without counting unassigned production", () => {
  expect(analyzeSchedule({ fronts: [], items: [] }, { panels: [{ object_name: "x", date: "2027-02-15" }] }).total).toBe(0);
});

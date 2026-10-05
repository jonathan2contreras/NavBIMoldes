// The jest config has no "@/" alias, and date-fns/locale is ESM-only: stub both for these UI tests.
jest.mock("@/lib/utils", () => jest.requireActual("../../lib/utils"), { virtual: true });
jest.mock("date-fns/locale", () => ({ es: undefined }));
const mockDroppables = [];
jest.mock("@dnd-kit/core", () => {
  const actual = jest.requireActual("@dnd-kit/core");
  return { ...actual, useDroppable: (options) => { mockDroppables.push(options); return actual.useDroppable(options); } };
});

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ScheduleBoard } from "./ScheduleBoard";
import { GanttTimeline } from "./GanttTimeline";
import { DayDetails } from "./DayDetails";
import { ScheduleControls } from "./ScheduleControls";
import { dayFull, dayProgress, goalText, roomText } from "./goal";

global.IS_REACT_ACT_ENVIRONMENT = true;
const START = "2026-11-02"; // Monday
const SUNDAY = "2026-11-08";
const panel = (n, date, area, molde = "M1") => ({ object_name: `p${n}`, code: `P${n}`, molde, tipo: "T", color: "#E4572E", date, area, floor_label: "P1", facade_label: "Norte", sequence_index: n });
const base = (extra = {}) => ({
  start_date: START, daily_capacity: 3, capacity_unit: "panels", daily_area: null, revision: 1, saved: true, needs_replan: false, unscheduled: 0, awaiting_location: 0,
  molds: [{ name: "M1", color: "#E4572E", copies: 1, scheduled: 2, total: 2, tipo: "T" }], production_days: [],
  panels: [panel(1, "2026-11-03", 8), panel(2, SUNDAY, 6)], ...extra,
});
let host, root;
beforeEach(() => { mockDroppables.length = 0; host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const q = (id) => document.querySelector(`[data-testid="${id}"]`);
const render = (ui) => act(async () => root.render(ui));
const noop = () => {};

describe("goal helpers", () => {
  test("labels, completion and room for both units", () => {
    const panels = base(), area = base({ capacity_unit: "m2", daily_area: 20 });
    expect(goalText(panels)).toBe("3 paneles/día");
    expect(goalText(area)).toMatch(/^20 m²\/día$/);
    expect(dayFull(panels, 3, 0)).toBe(true); expect(dayFull(panels, 2, 99)).toBe(false);
    expect(dayFull(area, 1, 19.5)).toBe(false); expect(dayFull(area, 1, 20)).toBe(true); expect(dayFull(area, 1, 31)).toBe(true);
    expect(roomText(panels, 1, 0)).toBe("2 huecos en la agenda");
    expect(roomText(area, 1, 12.5)).toBe("Faltan 7,5 m² para el objetivo");
  });
  test("Sundays have no goal, only a manual count", () => {
    expect(dayProgress(base(), SUNDAY, 0, 0)).toBe("Domingo · a mano");
    expect(dayProgress(base(), SUNDAY, 2, 9)).toBe("2 paneles · a mano");
    expect(dayProgress(base(), "2026-11-03", 1, 8)).toBe("1 / 3 paneles");
    expect(dayProgress(base({ capacity_unit: "m2", daily_area: 20 }), "2026-11-03", 1, 8)).toBe("8 / 20 m²");
  });
});

describe("board", () => {
  test("shows the Sunday column, with its panels, and accepts drops from admins", async () => {
    await render(<ScheduleBoard data={base()} selected={START} onSelect={noop} admin busy={false} onMove={noop} rangeStart={START} setRangeStart={noop} />);
    expect(document.querySelectorAll('[data-testid^="board-column-"]').length).toBe(7);
    expect(q(`board-column-${SUNDAY}`).textContent).toContain("P2");
    expect(q(`board-progress-${SUNDAY}`).textContent).toBe("1 panel · a mano");
    const sundayDrop = mockDroppables.find((o) => o.id === SUNDAY);
    expect(sundayDrop.disabled).toBe(false);
  });
  test("an empty Sunday invites admins to drop a panel; viewers can't drop", async () => {
    const data = base({ panels: [panel(1, "2026-11-03", 8)] });
    await render(<ScheduleBoard data={data} selected={START} onSelect={noop} admin busy={false} onMove={noop} rangeStart={START} setRangeStart={noop} />);
    expect(q(`board-sunday-hint-${SUNDAY}`)).not.toBeNull();
    mockDroppables.length = 0;
    await render(<ScheduleBoard data={data} selected={START} onSelect={noop} admin={false} busy={false} onMove={noop} rangeStart={START} setRangeStart={noop} />);
    expect(q(`board-sunday-hint-${SUNDAY}`)).toBeNull();
    expect(mockDroppables.find((o) => o.id === SUNDAY).disabled).toBe(true);
  });
  test("days before the start date still cannot receive panels", async () => {
    await render(<ScheduleBoard data={base()} selected={START} onSelect={noop} admin busy={false} onMove={noop} rangeStart="2026-10-29" setRangeStart={noop} />);
    expect(mockDroppables.find((o) => o.id === "2026-10-30").disabled).toBe(true);
    expect(mockDroppables.find((o) => o.id === START).disabled).toBe(false);
  });
});

describe("gantt", () => {
  test("Sunday cells accept drops from admins and show the m² goal per day", async () => {
    const data = base({ capacity_unit: "m2", daily_area: 20 });
    await render(<GanttTimeline data={data} selected={START} onSelect={noop} admin busy={false} onMove={noop} onSetCopies={noop} rangeStart={START} setRangeStart={noop} />);
    const sunday = mockDroppables.find((o) => o.id === `M1|${SUNDAY}|0`);
    expect(sunday.disabled).toBe(false);
    expect(q(`gantt-cell-M1-${SUNDAY}`).className).toContain("gantt-sunday");
    expect(q(`gantt-day-area-2026-11-03`).textContent).toContain("/ 20");
    expect(q(`gantt-day-count-${SUNDAY}`).textContent.trim()).toBe("1");     // no "/ goal" on Sundays
    expect(q(`gantt-day-count-2026-11-03`).textContent.trim()).toBe("1");    // m² mode counts panels without a panel goal
  });
  test("in panels mode the weekday total keeps its / goal", async () => {
    await render(<GanttTimeline data={base()} selected={START} onSelect={noop} admin busy={false} onMove={noop} onSetCopies={noop} rangeStart={START} setRangeStart={noop} />);
    expect(q("gantt-day-count-2026-11-03").textContent).toContain("1 / 3");
  });
});

describe("day details", () => {
  test("a Sunday lets admins add a pending panel by hand", async () => {
    const data = base({ panels: [panel(1, "2026-11-03", 8), { ...panel(3, null, 5, "M1"), date: null }] });
    await render(<DayDetails data={data} selected={SUNDAY} onSelect={noop} admin busy={false} onMove={noop} />);
    expect(q("schedule-day-availability").textContent).toContain("Domingo");
    expect(q("schedule-day-availability").textContent).toContain("a mano");
    expect(q("schedule-pending-select").disabled).toBe(false);
  });
  test("in m² mode a day that met the goal shows it and blocks further additions", async () => {
    const data = base({ capacity_unit: "m2", daily_area: 10, panels: [panel(1, "2026-11-03", 12), { ...panel(3, null, 5, "M2"), date: null }],
      molds: [{ name: "M1", copies: 1 }, { name: "M2", copies: 1 }],
      production_days: [{ date: "2026-11-03", scheduled: 1, target: 0, scheduled_area: 12, target_area: 10, shortfall: 0, status: "full", explanation: "Objetivo diario completo." }] });
    await render(<DayDetails data={data} selected="2026-11-03" onSelect={noop} admin busy={false} onMove={noop} />);
    expect(q("schedule-day-target-met").textContent).toContain("12/10 m²");
    expect(q("schedule-day-availability").textContent).toBe("Objetivo diario completo");
    expect(q("schedule-pending-select").disabled).toBe(true);
  });
});

describe("controls", () => {
  const setInput = (el, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, value); el.dispatchEvent(new Event("input", { bubbles: true })); };
  test("switching to m² asks for the m² value and sends it with the unit", async () => {
    const calls = [];
    await render(<ScheduleControls data={base()} admin busy={false} onGenerate={async (c) => { calls.push(c); return null; }} onSave={noop} onFill={noop} />);
    expect(q("schedule-capacity-input").value).toBe("3");
    await act(async () => q("schedule-unit-m2").click());
    expect(q("schedule-capacity-input")).toBeNull();
    await act(async () => setInput(q("schedule-area-input"), "42.5"));
    await act(async () => q("schedule-generate-button").click());
    expect(q("schedule-replan-values").textContent).toContain("42,5 m²/día");   // confirmation dialog for a saved schedule
    await act(async () => q("schedule-replan-confirm").click());
    expect(calls).toEqual([{ start_date: START, capacity_unit: "m2", daily_area: 42.5, revision: 1 }]);
  });
  test("panels stay the default and validate whole numbers", async () => {
    const calls = [];
    await render(<ScheduleControls data={base({ saved: false })} admin busy={false} onGenerate={async (c) => { calls.push(c); return null; }} onSave={noop} onFill={noop} />);
    await act(async () => setInput(q("schedule-capacity-input"), "2.5"));
    await act(async () => q("schedule-generate-button").click());
    expect(q("schedule-settings-error").textContent).toContain("entera");
    await act(async () => setInput(q("schedule-capacity-input"), "7"));
    await act(async () => q("schedule-generate-button").click());
    expect(calls).toEqual([{ start_date: START, capacity_unit: "panels", daily_capacity: 7, revision: 1 }]);
  });
  test("m² rejects empty, zero and negative values", async () => {
    await render(<ScheduleControls data={base()} admin busy={false} onGenerate={noop} onSave={noop} onFill={noop} />);
    await act(async () => q("schedule-unit-m2").click());
    for (const bad of ["", "0", "-3"]) {
      await act(async () => setInput(q("schedule-area-input"), bad));
      await act(async () => q("schedule-generate-button").click());
      expect(q("schedule-settings-error").textContent).toContain("m²");
      expect(q("schedule-replan-dialog")).toBeNull();
    }
  });
  test("visitors only see the goal as text", async () => {
    await render(<ScheduleControls data={base({ capacity_unit: "m2", daily_area: 30 })} admin={false} busy={false} onGenerate={noop} onSave={noop} onFill={noop} />);
    expect(q("schedule-readonly-settings").textContent).toContain("30 m²/día");
    expect(q("schedule-unit-m2")).toBeNull();
  });
});

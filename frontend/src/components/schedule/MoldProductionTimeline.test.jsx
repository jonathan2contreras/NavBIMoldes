import React, { act } from "react";
import { createRoot } from "react-dom/client";
import MoldProductionTimeline from "./MoldProductionTimeline";
import { buildReadiness } from "./moldReadiness";

global.IS_REACT_ACT_ENVIRONMENT = true;
let container;
let root;
beforeEach(() => {
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(() => act(() => root.unmount()));
const render = (data) => act(() => root.render(<MoldProductionTimeline readiness={buildReadiness(data)} />));

test("orders milestones, groups simultaneous starts and preserves schedule boundaries", () => {
  render({ start_date: "2026-12-01", molds: [], panels: [
    { molde: "M-02", date: "2026-12-08" },
    { molde: "M-01", date: "2026-12-03" },
    { molde: "M-03", date: "2026-12-03" },
    { molde: "M-01", date: "2026-12-15" },
  ] });
  const milestones = [...container.querySelectorAll('[data-testid="mold-production-milestone"]')];
  expect(milestones.map((item) => item.dataset.date)).toEqual(["2026-12-01", "2026-12-03", "2026-12-08", "2026-12-15"]);
  expect(milestones[1].querySelectorAll('[data-testid="mold-production-mold"]')).toHaveLength(2);
  expect(container.querySelectorAll('[data-testid="mold-production-mold"]')).toHaveLength(3);
  expect(milestones[0].textContent).toContain("Inicio del cronograma");
  expect(milestones[3].textContent).toContain("Fin de producción");
});

test("renders one point when start and finish are the same day", () => {
  render({ start_date: "2026-12-01", molds: [], panels: [{ molde: "M-01", date: "2026-12-01" }] });
  expect(container.querySelectorAll('[data-testid="mold-production-milestone"]')).toHaveLength(1);
  expect(container.textContent).toContain("Inicio del cronograma · Fin de producción");
  expect(container.querySelector('[data-testid="mold-production-mold"]').dataset.start).toBe("2026-12-01");
});

test("does not show a timeline without scheduled molds", () => {
  render({ start_date: "2026-12-01", molds: [{ name: "M-01" }], panels: [] });
  expect(container.childElementCount).toBe(0);
});

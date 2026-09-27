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

test("counts every copy as a mold and keeps the tally on its own line", () => {
  render({ start_date: "2026-12-01", molds: [
    { name: "M-01", copies: 2 }, { name: "M-02", copies: 1 }, { name: "M-03", copies: 1 },
  ], panels: [
    { molde: "M-01", date: "2026-12-01" },
    { molde: "M-02", date: "2026-12-01" },
    { molde: "M-03", date: "2026-12-01" },
  ] });
  const count = container.querySelector('[data-testid="mold-production-count"]');
  expect(count.textContent).toBe("Inicio de producción4 moldes");
  expect(count.querySelector("br")).not.toBeNull();
  expect(container.querySelectorAll('[data-testid="mold-production-mold"]')).toHaveLength(3);
});

test("shows the number of copies only for duplicated molds", () => {
  render({ start_date: "2026-12-01", molds: [
    { name: "M-01", copies: 3 }, { name: "M-02", copies: 1 },
  ], panels: [
    { molde: "M-01", date: "2026-12-01" },
    { molde: "M-02", date: "2026-12-02" },
  ] });
  const duplicated = container.querySelector('[data-mold="M-01"]');
  const normal = container.querySelector('[data-mold="M-02"]');
  expect(duplicated.querySelector('[data-testid="mold-production-copies"]').textContent).toBe("3 copias");
  expect(normal.querySelector('[data-testid="mold-production-copies"]')).toBeNull();
});

test("does not show a timeline without scheduled molds", () => {
  render({ start_date: "2026-12-01", molds: [{ name: "M-01" }], panels: [] });
  expect(container.childElementCount).toBe(0);
});

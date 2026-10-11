// The jest config has no "@/" alias, so point it at the real module for the shared UI components.
jest.mock("@/lib/utils", () => jest.requireActual("../../lib/utils"), { virtual: true });
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ScheduleExport } from "./ScheduleExport";

global.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, clicked;
beforeEach(() => {
  clicked = [];
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () { clicked.push(this.getAttribute("href")); });
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); jest.restoreAllMocks(); });
const q = (id) => document.querySelector(`[data-testid="${id}"]`);
const open = async (kind) => { await act(async () => root.render(<ScheduleExport />)); await act(async () => q(`schedule-export-${kind}`).click()); };

test.each([["xlsx", "export.xlsx"], ["pdf", "export.pdf"], ["gantt", "export-gantt.pdf"]])("%s asks before downloading and nothing is downloaded yet", async (kind, file) => {
  await open(kind);
  expect(q("schedule-export-dialog")).not.toBeNull();
  expect(q("schedule-export-sheets").textContent).toContain("Varias hojas");
  expect(q("schedule-export-continuous").textContent).toContain("Hoja continua");
  expect(clicked).toEqual([]);
  await act(async () => q("schedule-export-sheets").click());
  expect(clicked).toEqual([expect.stringMatching(new RegExp(`/api/schedule/${file}\\?layout=sheets$`))]);
});

test("choosing a continuous sheet downloads with layout=continuous and closes the dialog", async () => {
  await open("gantt");
  await act(async () => q("schedule-export-continuous").click());
  expect(clicked).toEqual([expect.stringMatching(/\/api\/schedule\/export-gantt\.pdf\?layout=continuous$/)]);
  expect(q("schedule-export-dialog")).toBeNull();
});

test("cancelling downloads nothing", async () => {
  await open("pdf");
  await act(async () => q("schedule-export-cancel").click());
  expect(clicked).toEqual([]);
  expect(q("schedule-export-dialog")).toBeNull();
});

test("the dialog text describes the chosen format", async () => {
  await open("xlsx");
  expect(q("schedule-export-dialog").textContent).toContain("Excel");
  expect(q("schedule-export-sheets").textContent).toContain("plan de instalación");
});

import { sunday } from "./dates";

/** The daily goal is either a number of panels or square meters per day (data.capacity_unit). */
export const isAreaGoal = (data) => data.capacity_unit === "m2";
export const num = (value) => (value || 0).toLocaleString("es", { maximumFractionDigits: 2 });

export const goalText = ({ capacity_unit, daily_capacity, daily_area }) =>
  capacity_unit === "m2" ? `${num(daily_area)} m²/día` : `${daily_capacity} paneles/día`;

/** True once a day meets the goal (in m² mode the last panel may overshoot it). */
export const dayFull = (data, count, area) => (isAreaGoal(data) ? area + 1e-9 >= data.daily_area : count >= data.daily_capacity);

/** 0..1 progress towards the goal. */
export const dayRatio = (data, count, area) => Math.min(1, isAreaGoal(data) ? area / (data.daily_area || 1) : count / (data.daily_capacity || 1));

/** Remaining room on a day, e.g. "3 huecos en la agenda" or "Faltan 7,5 m² para el objetivo". */
export const roomText = (data, count, area) => {
  if (dayFull(data, count, area)) return "Objetivo diario completo";
  if (isAreaGoal(data)) return `Faltan ${num(data.daily_area - area)} m² para el objetivo`;
  const left = data.daily_capacity - count;
  return `${left} ${left === 1 ? "hueco" : "huecos"} en la agenda`;
};

/** Short "made / goal" text for a day header. Sundays are manual-only, so they have no goal. */
export const dayProgress = (data, day, count, area) => {
  if (day < data.start_date) return "—";
  if (sunday(day)) return count ? `${count} ${count === 1 ? "panel" : "paneles"} · a mano` : "Domingo · a mano";
  return isAreaGoal(data) ? `${num(area)} / ${num(data.daily_area)} m²` : `${count} / ${data.daily_capacity} paneles`;
};

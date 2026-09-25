import { addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const iso = (value) => format(value, "yyyy-MM-dd");
export const shiftDay = (value, count) => iso(addDays(parseISO(value), count));
export const sunday = (value) => parseISO(value).getDay() === 0;
export const dateLabel = (value, pattern = "d MMM yyyy") => value ? format(parseISO(value), pattern, { locale: es }) : "—";
export const areaLabel = (value) => `${(value || 0).toLocaleString("es", { maximumFractionDigits: 2 })} m²`;
export const dayArea = (panels) => panels.reduce((sum, p) => sum + (p.area || 0), 0);
export const panelKey = (name) => encodeURIComponent(name);
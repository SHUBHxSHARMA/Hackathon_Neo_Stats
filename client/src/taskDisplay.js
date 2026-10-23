export const STATUS_OPTIONS = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const DATE_MIN = "2000-01-01";
export const DATE_MAX = "2100-12-31";

const YMD = /^(\d{4})-(\d{2})-(\d{2})/;
const US_SLASH = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function statusLabel(status) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

export function priorityLabel(priority) {
  return PRIORITY_OPTIONS.find((option) => option.value === priority)?.label || priority || "Medium";
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function ymdFromParts(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!y || !m || !d) return "";
  if (y < 2000 || y > 2100) return "";
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return "";
  }
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function ymdFromUtcDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return ymdFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Only "" or YYYY-MM-DD. Never ISO times, never mm/dd/yyyy. */
export function dueDateInputValue(value) {
  if (value == null || value === "") return "";
  if (value instanceof Date) return ymdFromUtcDate(value);

  const text = String(value).trim();
  if (!text) return "";

  const iso = YMD.exec(text);
  if (iso) return ymdFromParts(iso[1], iso[2], iso[3]);

  const slash = US_SLASH.exec(text);
  if (slash) return ymdFromParts(slash[3], slash[1], slash[2]);

  return "";
}

export function sanitizeDueDate(value) {
  return dueDateInputValue(value);
}

export function dueDatePayload(value) {
  return dueDateInputValue(value) || null;
}

export function formatDueDate(value) {
  const ymd = dueDateInputValue(value);
  if (!ymd) return "";
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function localTodayYmd() {
  const now = new Date();
  return ymdFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

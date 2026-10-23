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

export function statusLabel(status) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

export function priorityLabel(priority) {
  return PRIORITY_OPTIONS.find((option) => option.value === priority)?.label || priority || "Medium";
}

export function dueDateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export function formatDueDate(value) {
  if (!value) return "";
  const ymd = dueDateInputValue(value);
  const [year, month, day] = ymd.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function sanitizeDueDate(value) {
  if (!value) return "";
  const year = Number(String(value).slice(0, 4));
  if (year < 2000 || year > 2100) return "";
  return String(value).slice(0, 10);
}

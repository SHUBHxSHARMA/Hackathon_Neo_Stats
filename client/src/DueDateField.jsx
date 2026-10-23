import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DATE_MAX,
  DATE_MIN,
  dueDateInputValue,
  formatDueDate,
  localTodayYmd,
} from "./taskDisplay.js";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function splitYmd(value) {
  const ymd = dueDateInputValue(value);
  if (!ymd) return null;
  const [year, month, day] = ymd.split("-").map(Number);
  return { year, month, day };
}

function makeYmd(year, month, day) {
  return dueDateInputValue(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  );
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
}

function firstWeekday(year, month) {
  return new Date(Date.UTC(year, month - 1, 1, 12)).getUTCDay();
}

function shiftMonth(year, month, delta) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1, 12));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function placePopover(anchor, pop) {
  const rect = anchor.getBoundingClientRect();
  const width = Math.max(rect.width, 292);
  const height = pop?.offsetHeight || 320;
  const gap = 8;
  const spaceBelow = window.innerHeight - rect.bottom - gap;
  const openUp = spaceBelow < height && rect.top > spaceBelow;
  const top = openUp ? Math.max(8, rect.top - height - gap) : rect.bottom + gap;
  let left = rect.left;
  if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
  if (left < 8) left = 8;
  return { top, left, width };
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function DueDateField({ value, onChange, disabled = false }) {
  const ymd = dueDateInputValue(value);
  const inputId = useId();
  const wrapRef = useRef(null);
  const popRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 292 });
  const selected = splitYmd(ymd);
  const today = localTodayYmd();
  const initial = selected || splitYmd(today) || { year: 2026, month: 10, day: 1 };
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return undefined;
    function update() {
      setCoords(placePopover(wrapRef.current, popRef.current));
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, viewYear, viewMonth]);

  useEffect(() => {
    if (!open) return undefined;
    const next = selected || splitYmd(today);
    if (next) {
      setViewYear(next.year);
      setViewMonth(next.month);
    }

    function onPointer(event) {
      if (wrapRef.current?.contains(event.target) || popRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  function commit(next) {
    onChange(dueDateInputValue(next));
    setOpen(false);
  }

  function moveMonth(delta) {
    const next = shiftMonth(viewYear, viewMonth, delta);
    if (makeYmd(next.year, next.month, 1)) {
      setViewYear(next.year);
      setViewMonth(next.month);
    }
  }

  const blanks = firstWeekday(viewYear, viewMonth);
  const count = daysInMonth(viewYear, viewMonth);
  const cells = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: count }, (_, index) => index + 1),
  ];

  const popover = open && !disabled && (
    <div
      ref={popRef}
      className="date-pop"
      role="dialog"
      aria-label="Choose due date"
      style={{ top: coords.top, left: coords.left, width: coords.width }}
    >
      <div className="date-pop-head">
        <button className="date-pop-nav" type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">
          ‹
        </button>
        <b>
          {MONTHS[viewMonth - 1]} {viewYear}
        </b>
        <button className="date-pop-nav" type="button" onClick={() => moveMonth(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="date-pop-grid">
        {WEEKDAYS.map((day) => (
          <span className="date-pop-dow" key={day}>
            {day}
          </span>
        ))}
        {cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} />;
          const cell = makeYmd(viewYear, viewMonth, day);
          if (!cell) return <span key={day} />;
          const selectedDay = cell === ymd;
          const todayDay = cell === today;
          return (
            <button
              key={day}
              type="button"
              className={`date-pop-day${selectedDay ? " is-selected" : ""}${todayDay ? " is-today" : ""}`}
              onClick={() => commit(cell)}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="date-pop-actions">
        <button className="btn ghost" type="button" onClick={() => commit("")}>
          Clear
        </button>
        <button className="btn ghost" type="button" onClick={() => commit(today)}>
          Today
        </button>
      </div>
    </div>
  );

  return (
    <div className="date-field" ref={wrapRef}>
      <input
        id={inputId}
        className="date-field-native"
        type="date"
        lang="en-CA"
        min={DATE_MIN}
        max={DATE_MAX}
        value={ymd}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => onChange(dueDateInputValue(event.target.value))}
      />
      <button
        className={`date-field-toggle${ymd ? "" : " is-empty"}`}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => !disabled && setOpen((current) => !current)}
      >
        <span>{ymd ? formatDueDate(ymd) : "No due date"}</span>
        <CalendarIcon />
      </button>
      {popover ? createPortal(popover, document.body) : null}
    </div>
  );
}

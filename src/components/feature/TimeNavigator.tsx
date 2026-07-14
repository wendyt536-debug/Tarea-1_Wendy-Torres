import { useState, useCallback, useEffect, useMemo } from "react";
import type { DateDimension } from "@/lib/calculations";

export type { DateDimension } from "@/lib/calculations";

export interface Period {
  year: number;
  month: number; // 0-11
}

export interface TimeFilterState {
  dimension: DateDimension;
  periods: Period[];
  viewYear: number;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STORAGE_KEY = "dashboard_time_filter_v2";

// ---- sessionStorage ----

function migrateOldFormat(raw: Record<string, unknown>): TimeFilterState {
  // v1 format: { dimension, year: number|"all", month: number|"all" }
  const year = raw.year as number | "all" | undefined;
  const month = raw.month as number | "all" | undefined;
  const dim = (raw.dimension as DateDimension) ?? "assignmentDate";
  const cy = new Date().getFullYear();

  if (year === "all" || year === undefined) {
    return { dimension: dim, periods: [], viewYear: cy };
  }

  if (month === "all") {
    const periods: Period[] = [];
    for (let m = 0; m < 12; m++) periods.push({ year: year as number, month: m });
    return { dimension: dim, periods, viewYear: year as number };
  }

  return {
    dimension: dim,
    periods: [{ year: year as number, month: month as number }],
    viewYear: year as number,
  };
}

function sanitizeState(raw: Record<string, unknown>): TimeFilterState {
  const cy = new Date().getFullYear();
  const dim = raw.dimension;
  const dimension: DateDimension =
    dim === "assignmentDate" || dim === "receivedDate" || dim === "finishingDate"
      ? dim
      : "assignmentDate";

  const rawPeriods = Array.isArray(raw.periods) ? raw.periods : [];
  const periods: Period[] = rawPeriods
    .filter(
      (p): p is Period =>
        !!p &&
        typeof (p as Period).year === "number" &&
        typeof (p as Period).month === "number" &&
        !Number.isNaN((p as Period).year) &&
        !Number.isNaN((p as Period).month),
    )
    .map((p) => ({ year: p.year, month: p.month }));

  const vy = raw.viewYear;
  const viewYear = typeof vy === "number" && !Number.isNaN(vy) ? vy : cy;

  return { dimension, periods, viewYear };
}

function loadFromSession(): TimeFilterState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Detect old v1 format
    if ("year" in parsed && !("periods" in parsed)) {
      return sanitizeState(migrateOldFormat(parsed) as unknown as Record<string, unknown>);
    }
    return sanitizeState(parsed);
  } catch {
    return null;
  }
}

function saveToSession(state: TimeFilterState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* no-op */ }
}

function defaultState(): TimeFilterState {
  return {
    dimension: "assignmentDate",
    periods: [],
    viewYear: new Date().getFullYear(),
  };
}

// ---- helpers ----

function periodKey(p: Period): string {
  return `${p.year}-${p.month}`;
}

interface Props {
  onChange: (state: TimeFilterState) => void;
}

export default function TimeNavigator({ onChange }: Props) {
  const [state, setState] = useState<TimeFilterState>(() => {
    return loadFromSession() ?? defaultState();
  });

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const periodSet = useMemo(() => {
    return new Set(state.periods.map(periodKey));
  }, [state.periods]);

  const emit = useCallback(
    (next: TimeFilterState) => {
      setState(next);
      saveToSession(next);
      onChange(next);
    },
    [onChange],
  );

  // Emit initial state on first render
  useEffect(() => {
    onChange(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAllTime = state.periods.length === 0;

  // ---- actions ----

  const setDimension = (d: DateDimension) => {
    emit({ ...state, dimension: d });
  };

  const goToPrevYear = () => {
    emit({ ...state, viewYear: state.viewYear - 1 });
  };

  const goToNextYear = () => {
    emit({ ...state, viewYear: state.viewYear + 1 });
  };

  const toggleMonth = (monthIdx: number) => {
    const key = periodKey({ year: state.viewYear, month: monthIdx });
    if (periodSet.has(key)) {
      // Remove this period
      const next = state.periods.filter(
        (p) => !(p.year === state.viewYear && p.month === monthIdx),
      );
      emit({ ...state, periods: next });
    } else {
      // Add this period
      emit({
        ...state,
        periods: [...state.periods, { year: state.viewYear, month: monthIdx }],
      });
    }
  };

  const selectAllMonthsInView = () => {
    // Add all 12 months of viewYear (replace any existing entries for this year)
    const otherPeriods = state.periods.filter((p) => p.year !== state.viewYear);
    const allMonths: Period[] = [];
    for (let m = 0; m < 12; m++) allMonths.push({ year: state.viewYear, month: m });
    emit({ ...state, periods: [...otherPeriods, ...allMonths] });
  };

  const clearAllMonthsInView = () => {
    const next = state.periods.filter((p) => p.year !== state.viewYear);
    emit({ ...state, periods: next });
  };

  const selectAllTime = () => {
    emit({ ...state, periods: [], viewYear: currentYear });
  };

  // ---- derived display data ----

  const selectedInView = useMemo(() => {
    return state.periods.filter((p) => p.year === state.viewYear).length;
  }, [state.periods, state.viewYear]);

  const isAllMonthsInView = selectedInView === 12;

  // Summary: how many periods across how many years
  const yearSet = useMemo(() => {
    const s = new Set<number>();
    state.periods.forEach((p) => s.add(p.year));
    return s;
  }, [state.periods]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Date Dimension selector */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
          Analyze by
        </span>
        <div className="flex items-center bg-slate-100 rounded-full p-0.5">
          {([
            { key: "assignmentDate" as const, label: "Assignment Date" },
            { key: "receivedDate" as const, label: "Received Date" },
            { key: "finishingDate" as const, label: "Finishing Date" },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDimension(opt.key)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all duration-150 whitespace-nowrap cursor-pointer ${
                state.dimension === opt.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month navigation bar */}
      <div className="px-4 py-3 flex items-center gap-2">
        {/* Year navigation */}
        <button
          onClick={goToPrevYear}
          className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Previous year"
        >
          <i className="ri-arrow-left-s-line text-sm"></i>
        </button>

        <span className="text-sm font-semibold text-slate-800 tabular-nums min-w-[48px] text-center select-none">
          {state.viewYear}
        </span>

        <button
          onClick={goToNextYear}
          className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Next year"
        >
          <i className="ri-arrow-right-s-line text-sm"></i>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Month buttons */}
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto">
          {MONTHS_SHORT.map((label, idx) => {
            const key = periodKey({ year: state.viewYear, month: idx });
            const isSelected = periodSet.has(key);
            const isCurrent = state.viewYear === currentYear && idx === currentMonth && !isAllTime;

            let btnClass = "px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer whitespace-nowrap ";

            if (isSelected) {
              btnClass += "bg-slate-800 text-white shadow-sm";
            } else if (isCurrent) {
              btnClass += "bg-slate-100 text-slate-800 ring-1 ring-slate-300";
            } else {
              btnClass += "text-slate-500 hover:text-slate-800 hover:bg-slate-100";
            }

            return (
              <button
                key={idx}
                onClick={() => toggleMonth(idx)}
                className={btnClass}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* All Months in this year */}
        {isAllMonthsInView ? (
          <button
            onClick={clearAllMonthsInView}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer whitespace-nowrap bg-slate-800 text-white shadow-sm"
          >
            All Months
          </button>
        ) : (
          <button
            onClick={selectAllMonthsInView}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer whitespace-nowrap text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            All Months
          </button>
        )}

        {/* All Time */}
        <button
          onClick={selectAllTime}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer whitespace-nowrap ${
            isAllTime
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 ring-1 ring-slate-200"
          }`}
        >
          All Time
        </button>
      </div>

      {/* Active filter indicator */}
      {!isAllTime && (
        <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">
              {state.dimension === "assignmentDate"
                ? "Assigned"
                : state.dimension === "receivedDate"
                  ? "Received"
                  : "Finished"}
            </span>{" "}
            ·{" "}
            {yearSet.size === 1 && selectedInView === state.periods.length
              ? selectedInView === 12
                ? `All months in ${state.viewYear}`
                : `${state.periods.length} month${state.periods.length > 1 ? "s" : ""} in ${state.viewYear}`
              : `${state.periods.length} month${state.periods.length > 1 ? "s" : ""} across ${yearSet.size} year${yearSet.size > 1 ? "s" : ""}`}
          </span>
        </div>
      )}
    </div>
  );
}
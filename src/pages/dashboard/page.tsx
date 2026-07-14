import { useMemo, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import AppLayout from "@/components/feature/AppLayout";
import PageHeader from "@/components/base/PageHeader";
import KpiCard from "./components/KpiCard";
import TimeNavigator from "@/components/feature/TimeNavigator";
import type { TimeFilterState } from "@/components/feature/TimeNavigator";
import { useStore, useCurrentUser, getUserNameById } from "@/lib/store";
import { useDropdownValues } from "@/hooks/useDropdownValues";
import {
  computeCompletionTime,
  computeDaysInProcess,
  monthLabel,
  filterIntakesByTime,
} from "@/lib/calculations";

const CHART_COLORS = ["#16a34a", "#0ea5e9", "#f59e0b", "#e11d48", "#8b5cf6", "#14b8a6", "#f97316", "#ec4899", "#6366f1", "#84cc16"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CLOSED_STATUSES = ["Published", "Closed", "Completed", "Cancelled", "Transferred to US Team"];

function isClosed(status: string): boolean {
  return CLOSED_STATUSES.includes(status);
}

export default function DashboardPage() {
  const store = useStore();
  const user = useCurrentUser();
  const intakes = store.intakes;
  const { values: dropdownValues } = useDropdownValues();

  // ---- Filters ----
  const [lobFilter, setLobFilter] = useState<string>("All");
  const [timeFilter, setTimeFilter] = useState<TimeFilterState>({
    dimension: "assignmentDate",
    periods: [],
    viewYear: new Date().getFullYear(),
  });

  const handleTimeChange = useCallback((tf: TimeFilterState) => {
    setTimeFilter(tf);
  }, []);

  // Apply LOB filter first, then time filter (intersection)
  const filteredIntakes = useMemo(() => {
    let result = lobFilter === "All" ? intakes : intakes.filter((i) => i.lineOfBusiness === lobFilter);
    result = filterIntakesByTime(result, timeFilter.dimension, timeFilter.periods);
    return result;
  }, [intakes, lobFilter, timeFilter]);

  const stats = useMemo(() => {
    const total = filteredIntakes.length;
    const open = filteredIntakes.filter((i) => !isClosed(i.status));
    const closed = filteredIntakes.filter((i) => isClosed(i.status));
    const published = filteredIntakes.filter((i) => i.status === "Published").length;
    const cancelled = filteredIntakes.filter((i) => i.status === "Cancelled").length;

    return { total, openCount: open.length, closedCount: closed.length, published, cancelled };
  }, [filteredIntakes]);

  const processMetrics = useMemo(() => {
    const closed = filteredIntakes.filter((i) => isClosed(i.status));
    const open = filteredIntakes.filter((i) => !isClosed(i.status));

    const completionTimes = closed
      .map((i) => computeCompletionTime(i))
      .filter((v): v is number => v !== null);
    const avgCompletion = completionTimes.length
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : 0;

    const daysList = open.map((i) => computeDaysInProcess(i));
    const avgDaysInProcess = daysList.length
      ? Math.round(daysList.reduce((a, b) => a + b, 0) / daysList.length)
      : 0;

    return { avgCompletion, avgDaysInProcess };
  }, [filteredIntakes]);

  const byOwner = useMemo(() => {
    const map = new Map<string, number>();
    filteredIntakes.forEach((i) => {
      const name = getUserNameById(i.assignedOwner, store.users);
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredIntakes, store.users]);

  const byLob = useMemo(() => {
    const map = new Map<string, number>();
    filteredIntakes.forEach((i) => map.set(i.lineOfBusiness, (map.get(i.lineOfBusiness) ?? 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredIntakes]);

  const byContractType = useMemo(() => {
    const map = new Map<string, number>();
    filteredIntakes.forEach((i) => {
      const key = i.contractType || "Unspecified";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [filteredIntakes]);

  const byRootCause = useMemo(() => {
    const map = new Map<string, number>();
    filteredIntakes.forEach((i) => {
      const key = i.rootCause || "Unspecified";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredIntakes]);

  const byKpEntity = useMemo(() => {
    const map = new Map<string, number>();
    filteredIntakes.forEach((i) => {
      const key = i.kpEntity || "Unspecified";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredIntakes]);

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, number>();
    filteredIntakes.forEach((i) => {
      const label = monthLabel(i.assignmentDate);
      if (!label) return;
      map.set(label, (map.get(label) ?? 0) + 1);
    });
    const arr = Array.from(map, ([label, count]) => ({
      label,
      count,
      sortKey: new Date(label).getTime(),
    }));
    arr.sort((a, b) => a.sortKey - b.sortKey);
    return arr;
  }, [filteredIntakes]);

  // Build filter badge text
  const timeFilterLabel = useMemo(() => {
    if (timeFilter.periods.length === 0) return null;
    const yearSet = new Set(timeFilter.periods.map((p) => p.year));
    const dim =
      timeFilter.dimension === "assignmentDate"
        ? "Assigned"
        : timeFilter.dimension === "receivedDate"
          ? "Received"
          : "Finished";
    if (yearSet.size === 1) {
      const y = timeFilter.periods[0].year;
      if (timeFilter.periods.length === 12) return `${dim} in ${y}`;
      return `${dim} in ${timeFilter.periods.length} month${timeFilter.periods.length > 1 ? "s" : ""} of ${y}`;
    }
    return `${dim} · ${timeFilter.periods.length} months across ${yearSet.size} years`;
  }, [timeFilter]);

  return (
    <AppLayout>
      {/* Time Navigator — primary filter */}
      <TimeNavigator onChange={handleTimeChange} />

      <div className="mt-4">
        <PageHeader
          title="Dashboard"
          description={`Welcome back, ${(user.name || user.email.split("@")[0]).split(" ")[0]} — here's the pulse of your contracting queue.`}
          icon="ri-dashboard-line"
          actions={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">LOB</span>
                <select
                  value={lobFilter}
                  onChange={(e) => setLobFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer min-w-[160px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300"
                >
                  <option value="All">All Lines of Business</option>
                  {dropdownValues.line_of_business.map((lob) => (
                    <option key={lob} value={lob}>{lob}</option>
                  ))}
                </select>
              </div>
              <div className="text-xs px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-200 whitespace-nowrap">
                <i className="ri-radar-line mr-1"></i>Live data
              </div>
            </div>
          }
        />

        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {lobFilter === "All" ? "All Lines of Business" : lobFilter}
          </span>
          <span className="text-xs text-slate-400">· {filteredIntakes.length} intakes</span>
          {timeFilterLabel && (
            <>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs text-slate-400">{timeFilterLabel}</span>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <KpiCard label="Total Intakes" value={stats.total} icon="ri-file-list-3-line" tone="default" />
        <KpiCard label="Open" value={stats.openCount} icon="ri-loader-4-line" tone="brand" />
        <KpiCard label="Closed" value={stats.closedCount} icon="ri-archive-line" tone="default" />
        <KpiCard label="Published" value={stats.published} icon="ri-checkbox-circle-line" tone="brand" />
        <KpiCard label="Cancelled" value={stats.cancelled} icon="ri-close-circle-line" tone="rose" />
      </div>

      {/* Process Metrics */}
      <div className="mb-6 p-5 bg-white rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Process Metrics</h3>
            <p className="text-xs text-slate-500 mt-0.5">Working-day completion &amp; cycle times</p>
          </div>
          <i className="ri-timer-line text-slate-400"></i>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Avg. Completion Time
            </div>
            <div className="text-2xl font-semibold text-slate-900 tabular-nums">
              {processMetrics.avgCompletion > 0 ? `${processMetrics.avgCompletion} d` : "—"}
            </div>
            <div className="text-xs text-slate-400 mt-1">Closed intakes · working days</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Avg. Days in Process
            </div>
            <div className="text-2xl font-semibold text-slate-900 tabular-nums">
              {processMetrics.avgDaysInProcess > 0 ? `${processMetrics.avgDaysInProcess} d` : "—"}
            </div>
            <div className="text-xs text-slate-400 mt-1">Open intakes · working days</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Total in View
            </div>
            <div className="text-2xl font-semibold text-slate-900 tabular-nums">
              {filteredIntakes.length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Matching current filters</div>
          </div>
        </div>
      </div>

      {/* Row 1: Monthly Trend + Owner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Monthly Intake Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Intakes assigned per month</p>
            </div>
            <i className="ri-line-chart-line text-slate-400"></i>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#16a34a" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Intakes by Owner</h3>
              <p className="text-xs text-slate-500 mt-0.5">Active workload distribution</p>
            </div>
            <i className="ri-team-line text-slate-400"></i>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={byOwner} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  height={60}
                />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: LOB + Contract Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {lobFilter === "All" ? (
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Intakes by Line of Business</h3>
                <p className="text-xs text-slate-500 mt-0.5">Volume by business area</p>
              </div>
              <i className="ri-building-line text-slate-400"></i>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart
                  data={byLob}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 40, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 p-5 flex items-center justify-center" style={{ minHeight: 320 }}>
            <div className="text-center">
              <i className="ri-building-line text-3xl text-slate-300 mb-2 block"></i>
              <p className="text-sm text-slate-500">Line of Business breakdown hidden</p>
              <p className="text-xs text-slate-400 mt-1">Switch to "All" to compare across business areas</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Intakes by Agreement Type</h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribution across contract kinds</p>
            </div>
            <i className="ri-file-copy-2-line text-slate-400"></i>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={byContractType}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {byContractType.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: "#64748b" }}
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Root Cause + KP Entity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Root Cause Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">Closed intake reasons by category</p>
            </div>
            <i className="ri-bug-line text-slate-400"></i>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart
                data={byRootCause}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 40, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Intakes by KP Entity</h3>
              <p className="text-xs text-slate-500 mt-0.5">Volume by healthcare entity</p>
            </div>
            <i className="ri-hospital-line text-slate-400"></i>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={byKpEntity} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  height={60}
                />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
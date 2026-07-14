import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "recharts";
import AppLayout from "@/components/feature/AppLayout";
import PageHeader from "@/components/base/PageHeader";
import StatusBadge from "@/components/base/StatusBadge";
import KpiCard from "@/pages/dashboard/components/KpiCard";
import { useStore, getLatestComment, getUserNameById } from "@/lib/store";
import {
  computeCompletionTime,
  computeDaysInProcess,
  formatDate,
  formatDateTime,
  isOutOfSLA,
  monthLabel,
} from "@/lib/calculations";
import { selectClass } from "@/components/base/FormField";
import { useDropdownValues } from "@/hooks/useDropdownValues";

const COLORS = ["#16a34a", "#0ea5e9", "#f59e0b", "#e11d48", "#8b5cf6", "#14b8a6", "#f97316", "#64748b"];

export default function ReportsPage() {
  const store = useStore();
  const navigate = useNavigate();
  const { values: dd } = useDropdownValues();
  const [lob, setLob] = useState("");
  const [entity, setEntity] = useState("");
  const [view, setView] = useState<"analytics" | "tracker">("analytics");

  const filtered = useMemo(() => {
    return store.intakes.filter((i) => {
      if (lob && i.lineOfBusiness !== lob) return false;
      if (entity && i.kpEntity !== entity) return false;
      return true;
    });
  }, [store.intakes, lob, entity]);

  const kpi = useMemo(() => {
    const total = filtered.length;
    const closed = filtered.filter((i) => ["Published", "Closed", "Completed", "Cancelled", "Transferred to US Team"].includes(i.status));
    const outSla = filtered.filter(isOutOfSLA).length;
    const cts = closed.map(computeCompletionTime).filter((v): v is number => v !== null);
    const avgCt = cts.length ? Math.round(cts.reduce((a, b) => a + b, 0) / cts.length) : 0;
    return {
      total,
      avgCt,
      outSla,
      slaPct: total ? Math.round(((total - outSla) / total) * 100) : 100,
    };
  }, [filtered]);

  const rootCauseData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((i) => {
      const key = i.rootCause || "N/A";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const kpEntityData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((i) => map.set(i.kpEntity, (map.get(i.kpEntity) ?? 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [filtered]);

  const monthlyClosed = useMemo(() => {
    const map = new Map<string, { assigned: number; closed: number }>();
    filtered.forEach((i) => {
      const key = monthLabel(i.assignmentDate);
      if (!key) return;
      const cur = map.get(key) ?? { assigned: 0, closed: 0 };
      cur.assigned += 1;
      if (["Published", "Closed", "Completed", "Cancelled", "Transferred to US Team"].includes(i.status)) cur.closed += 1;
      map.set(key, cur);
    });
    return Array.from(map, ([label, v]) => ({
      label,
      ...v,
      sortKey: new Date(label).getTime(),
    })).sort((a, b) => a.sortKey - b.sortKey);
  }, [filtered]);

  return (
    <AppLayout>
      <PageHeader
        title="Reports & Dashboards"
        description="Cross-cut analytics and the auto-generated Tracker view. Filters update every chart and row."
        icon="ri-bar-chart-2-line"
        actions={
          <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-white">
            <button
              type="button"
              onClick={() => setView("analytics")}
              className={`px-3 py-1.5 text-xs rounded font-medium cursor-pointer whitespace-nowrap ${
                view === "analytics" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <i className="ri-pie-chart-line mr-1"></i>Analytics
            </button>
            <button
              type="button"
              onClick={() => setView("tracker")}
              className={`px-3 py-1.5 text-xs rounded font-medium cursor-pointer whitespace-nowrap ${
                view === "tracker" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <i className="ri-table-line mr-1"></i>Tracker
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-5 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="flex-1 text-xs text-slate-500 flex items-center gap-2">
          <i className="ri-filter-line"></i>
          Global filters — every visualization and row updates.
        </div>
        <select className={selectClass + " md:w-56"} value={lob} onChange={(e) => setLob(e.target.value)}>
          <option value="">All Lines of Business</option>
          {dd.line_of_business.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <select className={selectClass + " md:w-56"} value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">All KP Entities</option>
          {dd.kp_entity.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setLob("");
            setEntity("");
          }}
          className="text-xs px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
        >
          Clear
        </button>
      </div>

      {view === "analytics" ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <KpiCard label="Intakes in view" value={kpi.total} icon="ri-file-list-3-line" />
            <KpiCard label="Avg. Completion Time" value={`${kpi.avgCt} d`} icon="ri-timer-line" tone="sky" />
            <KpiCard label="SLA Compliance" value={`${kpi.slaPct}%`} icon="ri-shield-check-line" tone="brand" />
            <KpiCard label="Out of SLA" value={kpi.outSla} icon="ri-alarm-warning-line" tone="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <ChartCard title="Root Cause Analysis" icon="ri-error-warning-line">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={rootCauseData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 40, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    width={120}
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
            </ChartCard>

            <ChartCard title="Intakes by KP Entity" icon="ri-building-2-line">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={kpEntityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95}>
                    {kpEntityData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
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
            </ChartCard>
          </div>

          <ChartCard title="Assigned vs. Closed by Month" icon="ri-calendar-line">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyClosed} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
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
                <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                <Bar dataKey="assigned" name="Assigned" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="closed" name="Closed" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Tracker</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Auto-generated consolidated view. No manual entry — all fields are computed from Phase 1 & 2.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {filtered.length} rows
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Intake #</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Owner</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Backup</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Request</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">LOB</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">KP Entity</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Supplier</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Contract #</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Contract Type</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Status</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Assigned</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Asg. Month</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Received</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Finished</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Fin. Month</th>
                  <th className="text-right px-3 py-3 font-medium whitespace-nowrap">Compl. (d)</th>
                  <th className="text-right px-3 py-3 font-medium whitespace-nowrap">Days in Proc.</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">SLA</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Root Cause</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Last Updated</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Last By</th>
                  <th className="text-left px-3 py-3 font-medium whitespace-nowrap">Latest Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((i) => {
                  const latest = getLatestComment(i.id);
                  const ct = computeCompletionTime(i);
                  return (
                    <tr key={i.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/intake/${i.id}`)}
                          className="text-brand-700 font-medium hover:underline cursor-pointer"
                        >
                          {i.intakeNumber}
                        </button>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-700">{getUserNameById(i.assignedOwner, store.users)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">{getUserNameById(i.backupOwner, store.users)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{i.requestType}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{i.lineOfBusiness}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{i.kpEntity}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{i.supplierName}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{i.contractNumber || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{i.contractType || "—"}</td>
                      <td className="px-3 py-2"><StatusBadge status={i.status} size="sm" /></td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{formatDate(i.assignmentDate)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">{monthLabel(i.assignmentDate) || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{formatDate(i.receivedDate)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{formatDate(i.finishingDate)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">{monthLabel(i.finishingDate) || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{ct === null ? "—" : ct}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{computeDaysInProcess(i)}</td>
                      <td className="px-3 py-2">
                        {isOutOfSLA(i) ? (
                          <span className="text-amber-700 text-xs font-medium">Out</span>
                        ) : (
                          <span className="text-emerald-700 text-xs font-medium">OK</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{i.rootCause || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">{formatDateTime(i.lastUpdated)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{i.lastUpdatedBy || "—"}</td>
                      <td className="px-3 py-2 max-w-[280px] truncate text-slate-500">
                        {latest ? latest.body : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function ChartCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <i className={`${icon} text-slate-400`}></i>
      </div>
      {children}
    </div>
  );
}
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/feature/AppLayout";
import PageHeader from "@/components/base/PageHeader";
import StatusBadge from "@/components/base/StatusBadge";
import PriorityBadge from "@/components/base/PriorityBadge";
import EmptyState from "@/components/base/EmptyState";
import { inputClass, selectClass } from "@/components/base/FormField";
import { useStore, useCurrentUser } from "@/lib/store";
import { useDropdownValues } from "@/hooks/useDropdownValues";
import { computeDaysInProcess, formatDate, isOutOfSLA } from "@/lib/calculations";

type SortKey = "assignmentDate" | "daysInProcess" | "priority" | "status" | "intakeNumber";

const PRIORITY_ORDER: Record<string, number> = { Critical: 3, High: 2, Medium: 1, Low: 0 };

export default function MyIntakesPage() {
  const store = useStore();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { values: dd } = useDropdownValues();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("assignmentDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const mine = useMemo(() => {
    const belongsToMe = (name: string, backup: string) =>
      name === user.name || backup === user.name;
    let list = store.intakes.filter((i) =>
      user.role === "Administrator"
        ? true
        : belongsToMe(i.assignedOwner, i.backupOwner),
    );
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.intakeNumber.toLowerCase().includes(q) ||
          i.supplierName.toLowerCase().includes(q) ||
          i.requestType.toLowerCase().includes(q),
      );
    }
    if (status) list = list.filter((i) => i.status === status);
    if (priority) list = list.filter((i) => i.priority === priority);

    list.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      if (sortKey === "assignmentDate") {
        av = new Date(a.assignmentDate).getTime();
        bv = new Date(b.assignmentDate).getTime();
      } else if (sortKey === "daysInProcess") {
        av = computeDaysInProcess(a);
        bv = computeDaysInProcess(b);
      } else if (sortKey === "priority") {
        av = PRIORITY_ORDER[a.priority] ?? 0;
        bv = PRIORITY_ORDER[b.priority] ?? 0;
      } else if (sortKey === "status") {
        av = a.status;
        bv = b.status;
      } else {
        av = a.intakeNumber;
        bv = b.intakeNumber;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [store.intakes, user, query, status, priority, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return "ri-arrow-up-down-line text-slate-300";
    return sortDir === "asc" ? "ri-arrow-up-line text-brand-600" : "ri-arrow-down-line text-brand-600";
  };

  const openCount = mine.filter((i) => !["Published", "Closed", "Completed", "Cancelled", "Transferred to US Team"].includes(i.status)).length;
  const overdueCount = mine.filter((i) => isOutOfSLA(i)).length;

  return (
    <AppLayout>
      <PageHeader
        title="My Intakes"
        description={
          user.role === "Administrator"
            ? "Full queue view (Administrator sees every Intake)."
            : "Intakes assigned to you as Owner or Backup Owner."
        }
        icon="ri-briefcase-line"
        actions={
          <>
            <div className="text-xs px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-200">
              <i className="ri-loader-4-line mr-1"></i>
              {openCount} open
            </div>
            {overdueCount > 0 ? (
              <div className="text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                <i className="ri-alarm-warning-line mr-1"></i>
                {overdueCount} out of SLA
              </div>
            ) : null}
          </>
        }
      />

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Intake number, supplier, or request type…"
              className={inputClass + " pl-9"}
            />
          </div>
          <select className={selectClass + " md:w-44"} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {dd.status.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            className={selectClass + " md:w-40"}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">All priorities</option>
            {["Low", "Medium", "High", "Critical"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>

        {mine.length === 0 ? (
          <EmptyState
            title="No intakes match your view"
            description="Try clearing filters, or ask an Administrator to assign one to you."
            icon="ri-inbox-2-line"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <Th onClick={() => toggleSort("intakeNumber")} icon={sortIcon("intakeNumber")}>Intake #</Th>
                  <Th>Supplier</Th>
                  <Th>Request Type</Th>
                  <Th onClick={() => toggleSort("status")} icon={sortIcon("status")}>Status</Th>
                  <Th onClick={() => toggleSort("priority")} icon={sortIcon("priority")}>Priority</Th>
                  <Th onClick={() => toggleSort("assignmentDate")} icon={sortIcon("assignmentDate")}>Assigned</Th>
                  <Th onClick={() => toggleSort("daysInProcess")} icon={sortIcon("daysInProcess")}>Days in Process</Th>
                  <Th className="text-right pr-6">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mine.map((i) => {
                  const days = computeDaysInProcess(i);
                  const overSla = isOutOfSLA(i);
                  return (
                    <tr key={i.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/intake/${i.id}`)}
                          className="text-brand-700 font-medium hover:underline cursor-pointer"
                        >
                          {i.intakeNumber}
                        </button>
                        {i.assignedOwner !== user.name && user.role !== "Administrator" ? (
                          <div className="text-xs text-slate-400 mt-0.5">Backup owner</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{i.supplierName}</td>
                      <td className="px-4 py-3 text-slate-600">{i.requestType}</td>
                      <td className="px-4 py-3"><StatusBadge status={i.status} size="sm" /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={i.priority} /></td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(i.assignmentDate)}</td>
                      <td className={`px-4 py-3 tabular-nums ${overSla ? "text-amber-700 font-semibold" : "text-slate-700"}`}>
                        {days} d {overSla ? <i className="ri-alarm-warning-line ml-1"></i> : null}
                      </td>
                      <td className="px-4 py-3 text-right pr-6">
                        <button
                          type="button"
                          onClick={() => navigate(`/intake/${i.id}`)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-brand-100 hover:text-brand-800 text-slate-700 cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-external-link-line"></i>
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

interface ThProps {
  children?: React.ReactNode;
  onClick?: () => void;
  icon?: string;
  className?: string;
}

function Th({ children, onClick, icon, className = "" }: ThProps) {
  return (
    <th className={`text-left px-4 py-3 font-medium ${className}`}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1 hover:text-slate-700 cursor-pointer whitespace-nowrap"
        >
          {children}
          {icon ? <i className={`${icon} text-sm`}></i> : null}
        </button>
      ) : (
        <span className="whitespace-nowrap">{children}</span>
      )}
    </th>
  );
}
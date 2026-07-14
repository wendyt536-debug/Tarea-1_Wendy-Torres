import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/feature/AppLayout";
import PageHeader from "@/components/base/PageHeader";
import StatusBadge from "@/components/base/StatusBadge";
import PriorityBadge from "@/components/base/PriorityBadge";
import EmptyState from "@/components/base/EmptyState";
import { inputClass, selectClass } from "@/components/base/FormField";
import { useStore } from "@/lib/store";
import {
  computeCompletionTime,
  computeDaysInProcess,
  formatDate,
  isOutOfSLA,
  monthLabel,
  yearLabel,
} from "@/lib/calculations";
import { useDropdownValues } from "@/hooks/useDropdownValues";


const PAGE_SIZE = 8;

interface Filters {
  status: string;
  owner: string;
  backupOwner: string;
  kpEntity: string;
  requestType: string;
  lineOfBusiness: string;
  contractType: string;
  priority: string;
  assignmentMonth: string;
  finishingMonth: string;
  year: string;
  outOfSla: string;
  supplier: string;
  requester: string;
}

const emptyFilters: Filters = {
  status: "",
  owner: "",
  backupOwner: "",
  kpEntity: "",
  requestType: "",
  lineOfBusiness: "",
  contractType: "",
  priority: "",
  assignmentMonth: "",
  finishingMonth: "",
  year: "",
  outOfSla: "",
  supplier: "",
  requester: "",
};

export default function DatabasePage() {
  const store = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const { values: dd } = useDropdownValues();

  const setF = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const assignmentMonths = useMemo(() => {
    const set = new Set<string>();
    store.intakes.forEach((i) => {
      const m = monthLabel(i.assignmentDate);
      if (m) set.add(m);
    });
    return Array.from(set);
  }, [store.intakes]);

  const finishingMonths = useMemo(() => {
    const set = new Set<string>();
    store.intakes.forEach((i) => {
      const m = monthLabel(i.finishingDate);
      if (m) set.add(m);
    });
    return Array.from(set);
  }, [store.intakes]);

  const years = useMemo(() => {
    const set = new Set<string>();
    store.intakes.forEach((i) => {
      const y = yearLabel(i.assignmentDate);
      if (y) set.add(y);
    });
    return Array.from(set).sort();
  }, [store.intakes]);

  const suppliers = useMemo(
    () => Array.from(new Set(store.intakes.map((i) => i.supplierName).filter(Boolean))).sort(),
    [store.intakes],
  );
  const requesters = useMemo(
    () => Array.from(new Set(store.intakes.map((i) => i.requesterName).filter(Boolean))).sort(),
    [store.intakes],
  );

  const filtered = useMemo(() => {
    return store.intakes.filter((i) => {
      if (query) {
        const q = query.toLowerCase();
        const hay = [
          i.intakeNumber,
          i.supplierName,
          i.requesterName,
          i.contractNumber,
          i.requestType,
          i.lineOfBusiness,
          i.assignedOwner,
          i.backupOwner,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status && i.status !== filters.status) return false;
      if (filters.owner && i.assignedOwner !== filters.owner) return false;
      if (filters.backupOwner && i.backupOwner !== filters.backupOwner) return false;
      if (filters.kpEntity && i.kpEntity !== filters.kpEntity) return false;
      if (filters.requestType && i.requestType !== filters.requestType) return false;
      if (filters.lineOfBusiness && i.lineOfBusiness !== filters.lineOfBusiness) return false;
      if (filters.contractType && i.contractType !== filters.contractType) return false;
      if (filters.priority && i.priority !== filters.priority) return false;
      if (filters.assignmentMonth && monthLabel(i.assignmentDate) !== filters.assignmentMonth)
        return false;
      if (filters.finishingMonth && monthLabel(i.finishingDate) !== filters.finishingMonth)
        return false;
      if (filters.year && yearLabel(i.assignmentDate) !== filters.year) return false;
      if (filters.outOfSla === "yes" && !isOutOfSLA(i)) return false;
      if (filters.outOfSla === "no" && isOutOfSLA(i)) return false;
      if (filters.supplier && i.supplierName !== filters.supplier) return false;
      if (filters.requester && i.requesterName !== filters.requester) return false;
      return true;
    });
  }, [store.intakes, query, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageStart = (pageSafe - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const exportToCsv = () => {
    const headers = [
      "Intake Number",
      "Supplier",
      "Request Type",
      "Line of Business",
      "KP Entity",
      "Owner",
      "Backup Owner",
      "Contract Number",
      "Contract Type",
      "Status",
      "Priority",
      "Assignment Date",
      "Received Date",
      "Finishing Date",
      "Days in Process",
      "Completion Time",
      "Out of SLA",
      "Last Updated",
      "Last Updated By",
    ];
    const rows = filtered.map((i) => [
      i.intakeNumber,
      i.supplierName,
      i.requestType,
      i.lineOfBusiness,
      i.kpEntity,
      i.assignedOwner,
      i.backupOwner,
      i.contractNumber,
      i.contractType,
      i.status,
      i.priority,
      i.assignmentDate,
      i.receivedDate,
      i.finishingDate,
      String(computeDaysInProcess(i)),
      computeCompletionTime(i) === null ? "" : String(computeCompletionTime(i)),
      isOutOfSLA(i) ? "Yes" : "No",
      i.lastUpdated,
      i.lastUpdatedBy,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `intakes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <PageHeader
        title="General Database"
        description="Every Intake, searchable and filterable. Export any view to Excel for reporting."
        icon="ri-database-2-line"
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="text-sm px-3 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <i className="ri-filter-3-line"></i>
              Filters
              {activeFilterCount > 0 ? (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={exportToCsv}
              className="text-sm px-3 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <i className="ri-file-excel-2-line"></i>
              Export to Excel
            </button>
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
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Global search across Intake numbers, contracts, suppliers, owners…"
              className={inputClass + " pl-9"}
            />
          </div>
          <div className="text-xs text-slate-500 whitespace-nowrap">
            <span className="font-semibold text-slate-700">{filtered.length}</span> intakes
          </div>
        </div>

        {showFilters ? (
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <FilterSelect label="Status" value={filters.status} onChange={(v) => setF({ status: v })}
              options={dd.status} />
            <FilterSelect label="Owner" value={filters.owner} onChange={(v) => setF({ owner: v })}
              options={dd.owner} />
            <FilterSelect label="Backup Owner" value={filters.backupOwner}
              onChange={(v) => setF({ backupOwner: v })} options={dd.owner} />
            <FilterSelect label="KP Entity" value={filters.kpEntity}
              onChange={(v) => setF({ kpEntity: v })} options={dd.kp_entity} />
            <FilterSelect label="Request Type" value={filters.requestType}
              onChange={(v) => setF({ requestType: v })} options={dd.request_type} />
            <FilterSelect label="Line of Business" value={filters.lineOfBusiness}
              onChange={(v) => setF({ lineOfBusiness: v })} options={dd.line_of_business} />
            <FilterSelect label="Contract Type" value={filters.contractType}
              onChange={(v) => setF({ contractType: v })} options={dd.contract_type} />
            <FilterSelect label="Priority" value={filters.priority}
              onChange={(v) => setF({ priority: v })} options={["Low", "Medium", "High", "Critical"]} />
            <FilterSelect label="Assignment Month" value={filters.assignmentMonth}
              onChange={(v) => setF({ assignmentMonth: v })} options={assignmentMonths} />
            <FilterSelect label="Finishing Month" value={filters.finishingMonth}
              onChange={(v) => setF({ finishingMonth: v })} options={finishingMonths} />
            <FilterSelect label="Year" value={filters.year}
              onChange={(v) => setF({ year: v })} options={years} />
            <FilterSelect label="Out of SLA" value={filters.outOfSla}
              onChange={(v) => setF({ outOfSla: v })} options={["yes", "no"]}
              renderOption={(v) => (v === "yes" ? "Yes" : v === "no" ? "No" : v)} />
            <FilterSelect label="Supplier" value={filters.supplier}
              onChange={(v) => setF({ supplier: v })} options={suppliers} />
            <FilterSelect label="Requester" value={filters.requester}
              onChange={(v) => setF({ requester: v })} options={requesters} />
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => { setFilters(emptyFilters); setPage(1); }}
                className="text-xs px-3 py-2 rounded-md border border-slate-200 text-slate-600 hover:bg-white cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-1"></i>Clear all
              </button>
            </div>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <EmptyState
            icon="ri-search-eye-line"
            title="No intakes match your criteria"
            description="Try adjusting the search or clearing filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Intake #</th>
                    <th className="text-left px-4 py-3 font-medium">Supplier</th>
                    <th className="text-left px-4 py-3 font-medium">Owner</th>
                    <th className="text-left px-4 py-3 font-medium">KP Entity</th>
                    <th className="text-left px-4 py-3 font-medium">Contract Type</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Priority</th>
                    <th className="text-left px-4 py-3 font-medium">Assigned</th>
                    <th className="text-left px-4 py-3 font-medium">SLA</th>
                    <th className="text-right px-4 py-3 font-medium pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageRows.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/intake/${i.id}`)}
                          className="text-brand-700 font-medium hover:underline cursor-pointer whitespace-nowrap"
                        >
                          {i.intakeNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{i.supplierName}</td>
                      <td className="px-4 py-3 text-slate-600">{i.assignedOwner}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{i.kpEntity}</td>
                      <td className="px-4 py-3 text-slate-600">{i.contractType || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={i.status} size="sm" /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={i.priority} /></td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(i.assignmentDate)}</td>
                      <td className="px-4 py-3">
                        {isOutOfSLA(i) ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                            <i className="ri-alarm-warning-line"></i>Out
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                            <i className="ri-check-line"></i>OK
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right pr-6">
                        <button
                          type="button"
                          onClick={() => navigate(`/intake/${i.id}`)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-brand-100 hover:text-brand-800 text-slate-700 cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-eye-line"></i>View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing <span className="font-medium text-slate-700">{pageStart + 1}</span>–
                <span className="font-medium text-slate-700">{Math.min(pageStart + PAGE_SIZE, filtered.length)}</span> of{" "}
                <span className="font-medium text-slate-700">{filtered.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <i className="ri-arrow-left-s-line"></i>
                </button>
                <span className="px-3 tabular-nums">
                  {pageSafe} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <i className="ri-arrow-right-s-line"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  renderOption?: (v: string) => string;
}

function FilterSelect({ label, value, onChange, options, renderOption }: FilterSelectProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select className={selectClass + " text-xs"} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {renderOption ? renderOption(o) : o}
          </option>
        ))}
      </select>
    </div>
  );
}
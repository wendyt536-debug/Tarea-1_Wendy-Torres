import type { IntakeStatus } from "@/types/intake";

const STATUS_STYLES: Record<string, string> = {
  // Legacy statuses (preserved for existing records)
  New: "bg-slate-100 text-slate-700 ring-slate-200",
  Assigned: "bg-violet-50 text-violet-700 ring-violet-200",
  "In Progress": "bg-brand-50 text-brand-700 ring-brand-200",
  "Pending Info": "bg-amber-50 text-amber-700 ring-amber-200",
  "Pending Requester": "bg-amber-50 text-amber-700 ring-amber-200",
  "Under Review": "bg-sky-50 text-sky-700 ring-sky-200",
  Closed: "bg-slate-100 text-slate-600 ring-slate-200",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "On Hold": "bg-orange-50 text-orange-700 ring-orange-200",
  // New standardized statuses
  Draft: "bg-slate-100 text-slate-700 ring-slate-200",
  "In review with KP Teams": "bg-brand-50 text-brand-700 ring-brand-200",
  "In review with the supplier": "bg-sky-50 text-sky-700 ring-sky-200",
  "Pending approvals": "bg-amber-50 text-amber-700 ring-amber-200",
  "Pending signatures": "bg-amber-50 text-amber-700 ring-amber-200",
  Published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  "Transferred to US Team": "bg-violet-50 text-violet-700 ring-violet-200",
  "Project on hold": "bg-orange-50 text-orange-700 ring-orange-200",
};

const FALLBACK_STYLE = "bg-slate-100 text-slate-600 ring-slate-200";

const STATUS_ICONS: Record<string, string> = {
  New: "ri-inbox-line",
  Assigned: "ri-user-received-line",
  "In Progress": "ri-loader-4-line",
  "Pending Info": "ri-question-line",
  "Pending Requester": "ri-time-line",
  "Under Review": "ri-search-eye-line",
  Closed: "ri-archive-line",
  Completed: "ri-check-double-line",
  "On Hold": "ri-pause-circle-line",
  Draft: "ri-draft-line",
  "In review with KP Teams": "ri-team-line",
  "In review with the supplier": "ri-building-2-line",
  "Pending approvals": "ri-thumb-up-line",
  "Pending signatures": "ri-pen-nib-line",
  Published: "ri-checkbox-circle-line",
  Cancelled: "ri-close-circle-line",
  "Transferred to US Team": "ri-flight-takeoff-line",
  "Project on hold": "ri-pause-circle-line",
};

const FALLBACK_ICON = "ri-record-circle-line";

interface Props {
  status: IntakeStatus;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: Props) {
  const cls = STATUS_STYLES[status] ?? FALLBACK_STYLE;
  const icon = STATUS_ICONS[status] ?? FALLBACK_ICON;
  const sizeCls = size === "sm" ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 ${cls} ${sizeCls} font-medium whitespace-nowrap`}
    >
      <i className={`${icon} text-sm leading-none`}></i>
      {status}
    </span>
  );
}
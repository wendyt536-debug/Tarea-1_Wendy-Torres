import type { Priority } from "@/types/intake";

const STYLES: Record<Priority, string> = {
  Low: "bg-slate-100 text-slate-700 ring-slate-200",
  Medium: "bg-sky-50 text-sky-700 ring-sky-200",
  High: "bg-amber-50 text-amber-700 ring-amber-200",
  Critical: "bg-rose-50 text-rose-700 ring-rose-200",
};

const DOTS: Record<Priority, string> = {
  Low: "bg-slate-400",
  Medium: "bg-sky-500",
  High: "bg-amber-500",
  Critical: "bg-rose-500",
};

interface Props {
  priority: Priority;
}

export default function PriorityBadge({ priority }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 px-2.5 py-1 text-xs font-medium whitespace-nowrap ${STYLES[priority]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOTS[priority]}`}></span>
      {priority}
    </span>
  );
}
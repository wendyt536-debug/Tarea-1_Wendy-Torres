interface Props {
  label: string;
  value: string | number;
  icon: string;
  tone?: "default" | "brand" | "amber" | "rose" | "sky";
  hint?: string;
}

const TONE_STYLES: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-slate-50 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
};

export default function KpiCard({ label, value, icon, tone = "default", hint }: Props) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 flex items-start gap-4">
      <div
        className={`w-11 h-11 flex items-center justify-center rounded-lg ring-1 ${TONE_STYLES[tone]}`}
      >
        <i className={`${icon} text-lg`}></i>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{value}</div>
        {hint ? <div className="text-xs text-slate-400 mt-1">{hint}</div> : null}
      </div>
    </div>
  );
}
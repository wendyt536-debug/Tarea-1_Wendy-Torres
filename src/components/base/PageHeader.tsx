import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  icon?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, description, icon, actions }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <i className={`${icon} text-xl`}></i>
          </div>
        ) : null}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h1>
          {description ? <p className="text-sm text-slate-500 mt-1">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
    </div>
  );
}
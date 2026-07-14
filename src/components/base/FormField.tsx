import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, required, hint, children, className = "" }: FieldProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export const inputClass =
  "w-full text-sm px-3 py-2 rounded-md bg-white border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition placeholder:text-slate-400";

export const selectClass =
  "w-full text-sm px-3 py-2 rounded-md bg-white border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition appearance-none pr-8 bg-no-repeat";
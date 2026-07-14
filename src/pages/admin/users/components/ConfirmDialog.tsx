interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-lg w-full max-w-sm p-6 border border-slate-200">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 ${danger ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"}`}>
            <i className={`${danger ? "ri-alert-line" : "ri-question-line"} text-lg`}></i>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-sm px-4 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`text-sm px-4 py-2 rounded-md text-white cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {loading ? <i className="ri-loader-4-line animate-spin"></i> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
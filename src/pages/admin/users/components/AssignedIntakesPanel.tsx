import { useNavigate } from "react-router-dom";
import { useStore, getUserIntakesByStatus, getUserNameById } from "@/lib/store";
import type { User } from "@/types/intake";
import StatusBadge from "@/components/base/StatusBadge";
import PriorityBadge from "@/components/base/PriorityBadge";
import { formatDate } from "@/lib/calculations";

interface AssignedIntakesPanelProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

export default function AssignedIntakesPanel({ open, user, onClose }: AssignedIntakesPanelProps) {
  const store = useStore();
  const navigate = useNavigate();

  if (!open || !user) return null;

  const intakeCategories = getUserIntakesByStatus(user.id, store.intakes);

  const sections = [
    { label: "Open Intakes", items: intakeCategories.open, color: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
    { label: "Completed Intakes", items: intakeCategories.completed, color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
    { label: "Drafts", items: intakeCategories.drafts, color: "bg-slate-100 text-slate-600", dot: "bg-slate-300" },
    { label: "Pending Approvals", items: intakeCategories.pendingApprovals, color: "bg-orange-50 text-orange-700", dot: "bg-orange-400" },
    { label: "Published Agreements", items: intakeCategories.published, color: "bg-teal-50 text-teal-700", dot: "bg-teal-400" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-white border-l border-slate-200 h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{user.name}</h3>
            <p className="text-xs text-slate-500">{user.jobTitle ?? user.role} · Assigned Intakes</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 cursor-pointer"
          >
            <i className="ri-close-line text-slate-500"></i>
          </button>
        </div>

        <div className="p-5">
          {/* Summary grid — all five categories with counts */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            {sections.map((section) => (
              <div
                key={section.label}
                className="flex flex-col items-center justify-center py-3 px-1 rounded-md border border-slate-100 bg-slate-50/60 text-center"
              >
                <span className="text-lg font-semibold text-slate-900">{section.items.length}</span>
                <span className="flex items-center gap-1 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${section.dot}`}></span>
                  <span className="text-[10px] leading-tight text-slate-500">{section.label}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            {sections.map((section) => {
              return (
                <div key={section.label}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${section.color}`}>
                      {section.label}
                    </span>
                    <span className="text-xs text-slate-400">{section.items.length}</span>
                  </div>
                  {section.items.length === 0 ? (
                    <div className="px-3 py-3 rounded-md border border-dashed border-slate-200 text-xs text-slate-400 text-center">
                      No {section.label.toLowerCase()}
                    </div>
                  ) : (
                  <div className="space-y-2">
                    {section.items.map((intake) => {
                      const ownerDisplay = getUserNameById(intake.assignedOwner, store.users);
                      return (
                        <button
                          key={intake.id}
                          type="button"
                          onClick={() => {
                            onClose();
                            navigate(`/intake/${intake.id}`);
                          }}
                          className="w-full text-left p-3 rounded-md border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">
                                {intake.intakeNumber}
                              </div>
                              <div className="text-xs text-slate-500 truncate mt-0.5">
                                {intake.supplierName}
                              </div>
                            </div>
                            <PriorityBadge priority={intake.priority} />
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={intake.status} size="sm" />
                            </div>
                            <span className="text-xs text-slate-400">{formatDate(intake.assignmentDate)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            })}
          </div>

          {intakeCategories.all.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <i className="ri-file-list-3-line text-xl"></i>
              </div>
              <p className="text-sm text-slate-500">No intakes assigned yet.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
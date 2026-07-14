import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/feature/AppLayout";
import PageHeader from "@/components/base/PageHeader";
import StatusBadge from "@/components/base/StatusBadge";
import PriorityBadge from "@/components/base/PriorityBadge";
import EmptyState from "@/components/base/EmptyState";
import { FormField, inputClass, selectClass } from "@/components/base/FormField";
import CommentsTimeline from "./components/CommentsTimeline";
import { useStore, useCurrentUser, updateIntake, addComment, getCommentsForIntake, getUserNameById, useAssignableUsers, isUserOwnerOrBackup, getUserOpenIntakeCount } from "@/lib/store";
import type { CommentType, Intake, IntakeStatus, User } from "@/types/intake";
import { useDropdownValues } from "@/hooks/useDropdownValues";
import {
  ROOT_CAUSES,
} from "@/mocks/dropdowns";
import {
  computeCompletionTime,
  computeDaysInProcess,
  formatCurrency,
  formatDate,
  formatDateTime,
  isOutOfSLA,
  monthLabel,
  SLA_DAYS,
} from "@/lib/calculations";

export default function IntakeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const user = useCurrentUser();
  const intake = store.intakes.find((i) => i.id === id);
  const { values: dd } = useDropdownValues();
  const assignableUsers = useAssignableUsers();

  const [form, setForm] = useState<Intake | null>(intake ?? null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setForm(intake ?? null);
  }, [intake]);

  const comments = useMemo(() => (id ? getCommentsForIntake(id) : []), [id, store.comments]);

  if (!intake || !form) {
    return (
      <AppLayout>
        <PageHeader title="Intake not found" icon="ri-error-warning-line" />
        <div className="bg-white rounded-lg border border-slate-200">
          <EmptyState
            title="This intake doesn't exist"
            description="It may have been deleted or the link is broken. Head back to the Database to find it."
          />
          <div className="p-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => navigate("/database")}
              className="text-sm px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 cursor-pointer whitespace-nowrap"
            >
              Back to Database
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isAdmin = user.role === "Administrator";
  const isMgmt = user.role === "Management";
  const isOwnerOrBackup = isUserOwnerOrBackup(intake, user);
  const canEditPhase2 = isAdmin || (user.role === "Contracting" && isOwnerOrBackup);
  const canReassign = isAdmin;

  const days = computeDaysInProcess(intake);
  const ct = computeCompletionTime(intake);
  const overSla = isOutOfSLA(intake);
  const slaProgress = Math.min(100, Math.round((days / SLA_DAYS) * 100));

  const update = (patch: Partial<Intake>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const handleSave = () => {
    if (!form || !user) return;
    updateIntake(intake.id, form, user.name).then(() => {
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2200);
    });
  };

  const handleQuickStatus = (s: IntakeStatus) => {
    const patch: Partial<Intake> = { status: s };
    if (["Published", "Cancelled", "Transferred to US Team"].includes(s) && !intake.finishingDate) {
      patch.finishingDate = new Date().toISOString().slice(0, 10);
    }
    updateIntake(intake.id, patch, user.name);
    addComment({
      intakeId: intake.id,
      userName: user.name,
      userRole: user.role,
      type: "timeline",
      body: `Status changed to ${s}.`,
    });
  };

  const handleAddComment = (body: string, type: CommentType) => {
    addComment({
      intakeId: intake.id,
      userName: user.name,
      userRole: user.role,
      type,
      body,
    });
  };

  const handleSelfAssign = () => {
    if (user.role !== "Contracting" && user.role !== "Administrator") return;
    updateIntake(intake.id, { assignedOwner: user.id }, user.name);
    addComment({
      intakeId: intake.id,
      userName: user.name,
      userRole: user.role,
      type: "timeline",
      body: `Self-assigned as Owner.`,
    });
  };

  const ownerName = getUserNameById(intake.assignedOwner, store.users);
  const backupName = getUserNameById(intake.backupOwner, store.users);

  return (
    <AppLayout>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
      >
        <i className="ri-arrow-left-line"></i>Back
      </button>

      <PageHeader
        title={intake.intakeNumber}
        description={`${intake.requestType} · ${intake.supplierName}`}
        icon="ri-file-list-3-line"
        actions={
          <>
            <StatusBadge status={intake.status} />
            <PriorityBadge priority={intake.priority} />
            {overSla ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 whitespace-nowrap">
                <i className="ri-alarm-warning-line mr-1"></i>Out of SLA
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 whitespace-nowrap">
                <i className="ri-check-line mr-1"></i>Within SLA
              </span>
            )}
          </>
        }
      />

      {savedFlash ? (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-md bg-brand-50 border border-brand-200 text-brand-800 text-sm">
          <i className="ri-checkbox-circle-line"></i>
          Changes saved. Database, Tracker, and Dashboards updated.
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          {/* Phase 1: Assignment (read-only) */}
          <section className="bg-slate-50 rounded-lg border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-200 text-slate-600 text-xs font-semibold">1</span>
                <h3 className="text-sm font-semibold text-slate-900">Assignment</h3>
                <span className="text-xs text-slate-500">· Read-only summary</span>
              </div>
              {canReassign ? (
                <ReassignButton
                  intake={intake}
                  assignableUsers={assignableUsers}
                  storeIntakes={store.intakes}
                  currentOwnerName={ownerName}
                  currentBackupName={backupName}
                  onReassign={(ownerId, backupId, comment) => {
                    updateIntake(intake.id, { assignedOwner: ownerId, backupOwner: backupId }, user.name);
                    if (comment.trim()) {
                      addComment({
                        intakeId: intake.id,
                        userName: user.name,
                        userRole: user.role,
                        type: "assignment",
                        body: comment.trim(),
                      });
                    }
                  }}
                />
              ) : (user.role === "Contracting" || user.role === "Administrator") && !isOwnerOrBackup ? (
                <button
                  type="button"
                  onClick={handleSelfAssign}
                  className="text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-brand-50 hover:text-brand-800 text-slate-700 cursor-pointer whitespace-nowrap flex items-center gap-1"
                >
                  <i className="ri-user-add-line"></i>Self-assign
                </button>
              ) : null}
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4 text-sm">
              <ReadField label="Intake Form Number" value={intake.intakeNumber} />
              <ReadField label="Request Type" value={intake.requestType} />
              <ReadField label="Line of Business" value={intake.lineOfBusiness} />
              <ReadField label="Supplier Name" value={intake.supplierName} />
              <ReadField label="KP Entity" value={intake.kpEntity} />
              <ReadField label="Priority" value={intake.priority} />
              <ReadField label="FDA Name" value={intake.fdaName} />
              <ReadField label="FDA NUID" value={intake.fdaNuid} />
              <ReadField label="Requester Name" value={intake.requesterName} />
              <ReadField label="Requester NUID" value={intake.requesterNuid} />
              <ReadField label="Assigned Owner" value={ownerName} highlight />
              <ReadField label="Backup Owner" value={backupName} />
              <ReadField label="Assignment Date" value={formatDate(intake.assignmentDate)} />
              <ReadField label="Assignment Month" value={monthLabel(intake.assignmentDate) || "—"} />
              <ReadField label="Days in Process" value={`${days} d`} />
              {intake.assignmentComments ? (
                <div className="md:col-span-3">
                  <div className="text-xs font-medium text-slate-500">Assignment Comments</div>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{intake.assignmentComments}</p>
                </div>
              ) : null}
            </div>
          </section>

          {/* Phase 2: Contracting workspace */}
          <section className="bg-white rounded-lg border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center rounded-md bg-brand-100 text-brand-700 text-xs font-semibold">2</span>
                <h3 className="text-sm font-semibold text-slate-900">Contracting Work</h3>
                <span className="text-xs text-slate-500">
                  · {canEditPhase2 ? "Editable" : "Read-only"}
                </span>
              </div>
              {canEditPhase2 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="hidden md:flex items-center gap-1 flex-wrap">
                    <span className="text-xs text-slate-500 mr-1">Quick status:</span>
                    {dd.status.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleQuickStatus(s as IntakeStatus)}
                        className={`text-[11px] px-2 py-1 rounded-md border cursor-pointer whitespace-nowrap ${
                          intake.status === s
                            ? "bg-brand-600 text-white border-brand-600"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Contract Number">
                <input
                  className={inputClass}
                  disabled={!canEditPhase2}
                  value={form.contractNumber}
                  onChange={(e) => update({ contractNumber: e.target.value })}
                />
              </FormField>
              <FormField label="Contract Type">
                <select
                  className={selectClass}
                  disabled={!canEditPhase2}
                  value={form.contractType}
                  onChange={(e) => update({ contractType: e.target.value })}
                >
                  <option value="">Select…</option>
                  {dd.contract_type.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Estimated Contract Amount (USD)">
                <input
                  type="number"
                  className={inputClass}
                  disabled={!canEditPhase2}
                  value={form.estimatedContractAmount ?? ""}
                  onChange={(e) =>
                    update({
                      estimatedContractAmount:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </FormField>
              <FormField label="Received Date">
                <input
                  type="date"
                  className={inputClass}
                  disabled={!canEditPhase2}
                  value={form.receivedDate}
                  onChange={(e) => update({ receivedDate: e.target.value })}
                />
              </FormField>
              <FormField label="Status">
                <select
                  className={selectClass}
                  disabled={!canEditPhase2}
                  value={form.status}
                  onChange={(e) => update({ status: e.target.value as IntakeStatus })}
                >
                  {dd.status.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Finishing Date">
                <input
                  type="date"
                  className={inputClass}
                  disabled={!canEditPhase2}
                  value={form.finishingDate}
                  onChange={(e) => update({ finishingDate: e.target.value })}
                />
              </FormField>
              <FormField label="Root Cause">
                <select
                  className={selectClass}
                  disabled={!canEditPhase2}
                  value={form.rootCause}
                  onChange={(e) => update({ rootCause: e.target.value })}
                >
                  <option value="">Select…</option>
                  {ROOT_CAUSES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Out of SLA">
                <input
                  className={inputClass + " bg-slate-50"}
                  disabled
                  value={overSla ? "Yes" : "No"}
                />
              </FormField>

              <FormField label="Documents Received" className="md:col-span-2">
                <textarea
                  className={inputClass + " resize-none"}
                  rows={2}
                  maxLength={500}
                  disabled={!canEditPhase2}
                  value={form.documentsReceived}
                  onChange={(e) => update({ documentsReceived: e.target.value })}
                />
              </FormField>
              <FormField label="Missing Information" className="md:col-span-2">
                <textarea
                  className={inputClass + " resize-none"}
                  rows={2}
                  maxLength={500}
                  disabled={!canEditPhase2}
                  value={form.missingInformation}
                  onChange={(e) => update({ missingInformation: e.target.value })}
                />
              </FormField>
              <FormField label="Internal Notes" className="md:col-span-2">
                <textarea
                  className={inputClass + " resize-none"}
                  rows={3}
                  maxLength={500}
                  disabled={!canEditPhase2}
                  value={form.internalNotes}
                  onChange={(e) => update({ internalNotes: e.target.value })}
                />
              </FormField>
              <FormField label="Follow-up Notes" className="md:col-span-2">
                <textarea
                  className={inputClass + " resize-none"}
                  rows={3}
                  maxLength={500}
                  disabled={!canEditPhase2}
                  value={form.followUpNotes}
                  onChange={(e) => update({ followUpNotes: e.target.value })}
                />
              </FormField>
              <FormField label="Final Comments" className="md:col-span-2">
                <textarea
                  className={inputClass + " resize-none"}
                  rows={2}
                  maxLength={500}
                  disabled={!canEditPhase2}
                  value={form.finalComments}
                  onChange={(e) => update({ finalComments: e.target.value })}
                />
              </FormField>
            </div>

            <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <i className="ri-upload-cloud-2-line"></i>Document upload coming soon
                </span>
                {isMgmt ? (
                  <span className="flex items-center gap-1">
                    <i className="ri-eye-line"></i>Management view — read-only
                  </span>
                ) : null}
              </div>
              {canEditPhase2 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(intake)}
                    className="text-sm px-4 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                  >
                    Revert
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="text-sm px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                  >
                    <i className="ri-save-line"></i>Save changes
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <CommentsTimeline
            comments={comments}
            canPost={canEditPhase2}
            onAdd={handleAddComment}
          />
        </div>

        <aside className="space-y-5">
          {/* SLA card */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">SLA Progress</h3>
            <div className="flex items-end justify-between mb-2">
              <div className="text-3xl font-semibold text-slate-900 tabular-nums">{days}</div>
              <div className="text-xs text-slate-500">of {SLA_DAYS} days</div>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${overSla ? "bg-amber-500" : "bg-brand-500"}`}
                style={{ width: `${slaProgress}%` }}
              ></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <StatItem label="Received" value={formatDate(intake.receivedDate)} />
              <StatItem label="Finished" value={formatDate(intake.finishingDate)} />
              <StatItem
                label="Completion"
                value={ct === null ? "In progress" : `${ct} d`}
              />
              <StatItem
                label="Est. Amount"
                value={formatCurrency(intake.estimatedContractAmount)}
              />
            </div>
          </div>

          {/* Meta */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Tracker Snapshot</h3>
            <dl className="space-y-2.5 text-xs">
              <Meta label="Contract #" value={intake.contractNumber || "—"} />
              <Meta label="Contract Type" value={intake.contractType || "—"} />
              <Meta label="Assignment Month" value={monthLabel(intake.assignmentDate) || "—"} />
              <Meta label="Finishing Month" value={monthLabel(intake.finishingDate) || "—"} />
              <Meta label="Root Cause" value={intake.rootCause || "—"} />
              <Meta label="Last Updated" value={formatDateTime(intake.lastUpdated)} />
              <Meta label="Updated By" value={intake.lastUpdatedBy || "—"} />
            </dl>
          </div>

          {/* Permission notice */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Your Access</h3>
            <div className="text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                <span>Role: <span className="font-medium text-slate-800">{user.role}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <i className={canEditPhase2 ? "ri-edit-line text-brand-600" : "ri-eye-line text-slate-400"}></i>
                <span>{canEditPhase2 ? "Can edit Phase 2 fields" : "Read-only on Phase 2"}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className={canReassign ? "ri-user-shared-line text-brand-600" : "ri-lock-line text-slate-400"}></i>
                <span>{canReassign ? "Can reassign owners" : "Cannot reassign"}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}

function ReadField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div
        className={`text-sm mt-0.5 ${
          highlight ? "text-brand-800 font-semibold" : "text-slate-800"
        }`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800 text-right font-medium">{value}</dd>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 border border-slate-100 px-3 py-2">
      <div className="text-slate-500 text-[11px] uppercase tracking-wider">{label}</div>
      <div className="text-slate-800 font-medium mt-0.5">{value}</div>
    </div>
  );
}

function ReassignButton({
  intake,
  assignableUsers,
  storeIntakes,
  currentOwnerName,
  currentBackupName,
  onReassign,
}: {
  intake: Intake;
  assignableUsers: User[];
  storeIntakes: Intake[];
  currentOwnerName: string;
  currentBackupName: string;
  onReassign: (owner: string, backup: string, comment: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState(intake.assignedOwner);
  const [backup, setBackup] = useState(intake.backupOwner);
  const [comment, setComment] = useState("");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-brand-50 hover:text-brand-800 text-slate-700 cursor-pointer whitespace-nowrap flex items-center gap-1"
      >
        <i className="ri-user-shared-line"></i>Reassign
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Reassign Intake</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 cursor-pointer"
              >
                <i className="ri-close-line text-slate-500"></i>
              </button>
            </div>
            <div className="space-y-3">
              <FormField label="Assigned Owner">
                <select className={selectClass} value={owner} onChange={(e) => setOwner(e.target.value)}>
                  {assignableUsers.map((u) => {
                    const wl = getUserOpenIntakeCount(u.id, storeIntakes);
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name}{u.jobTitle ? ` · ${u.jobTitle}` : ''} · {wl} Open
                      </option>
                    );
                  })}
                </select>
              </FormField>
              <FormField label="Backup Owner">
                <select className={selectClass} value={backup} onChange={(e) => setBackup(e.target.value)}>
                  <option value="">None</option>
                  {assignableUsers.filter((u) => u.id !== owner).map((u) => {
                    const wl = getUserOpenIntakeCount(u.id, storeIntakes);
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name}{u.jobTitle ? ` · ${u.jobTitle}` : ''} · {wl} Open
                      </option>
                    );
                  })}
                </select>
              </FormField>
              <FormField label="Reassignment Comment">
                <textarea
                  className={inputClass + " resize-none"}
                  rows={3}
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Reason for reassignment (optional)"
                />
              </FormField>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm px-4 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onReassign(owner, backup, comment);
                  setOpen(false);
                  setComment("");
                }}
                className="text-sm px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 cursor-pointer whitespace-nowrap"
              >
                Save reassignment
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
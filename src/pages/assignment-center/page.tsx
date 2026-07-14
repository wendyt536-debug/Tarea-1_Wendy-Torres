import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/feature/AppLayout";
import PageHeader from "@/components/base/PageHeader";
import StatusBadge from "@/components/base/StatusBadge";
import PriorityBadge from "@/components/base/PriorityBadge";
import EmptyState from "@/components/base/EmptyState";
import { FormField, inputClass, selectClass } from "@/components/base/FormField";
import { useStore, useCurrentUser, createIntake, addComment } from "@/lib/store";
import { useDropdownValues } from "@/hooks/useDropdownValues";
import { PRIORITIES } from "@/mocks/dropdowns";
import type { Priority } from "@/types/intake";
import { formatDate } from "@/lib/calculations";

const emptyForm = {
  intakeNumber: "",
  requestType: "",
  lineOfBusiness: "",
  supplierName: "",
  kpEntity: "",
  fdaName: "",
  fdaNuid: "",
  requesterName: "",
  requesterNuid: "",
  assignedOwner: "",
  backupOwner: "",
  assignmentDate: new Date().toISOString().slice(0, 10),
  priority: "Medium" as Priority,
  assignmentComments: "",
};

export default function AssignmentCenterPage() {
  const store = useStore();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState<string | null>(null);
  const { values: dd } = useDropdownValues();
  const kpEntities = dd.kp_entity;

  const isAdmin = user.role === "Administrator";

  const recent = useMemo(
    () =>
      [...store.intakes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [store.intakes],
  );

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !user) return;

    const required: Array<keyof typeof form> = [
      "intakeNumber",
      "requestType",
      "lineOfBusiness",
      "supplierName",
      "kpEntity",
      "requesterName",
      "assignedOwner",
      "priority",
      "assignmentDate",
    ];
    for (const key of required) {
      if (!form[key]) {
        setToast(`Please fill in ${key}`);
        return;
      }
    }

    createIntake({
      intakeNumber: form.intakeNumber,
      requestType: form.requestType,
      lineOfBusiness: form.lineOfBusiness,
      supplierName: form.supplierName,
      kpEntity: form.kpEntity,
      fdaName: form.fdaName,
      fdaNuid: form.fdaNuid,
      requesterName: form.requesterName,
      requesterNuid: form.requesterNuid,
      assignedOwner: form.assignedOwner,
      backupOwner: form.backupOwner,
      assignmentDate: form.assignmentDate,
      priority: form.priority,
      assignmentComments: form.assignmentComments,
      contractNumber: "",
      contractType: "",
      estimatedContractAmount: null,
      receivedDate: "",
      status: "Draft",
      finishingDate: "",
      rootCause: "",
      documentsReceived: "",
      missingInformation: "",
      internalNotes: "",
      followUpNotes: "",
      finalComments: "",
      lastUpdatedBy: user.name,
      createdBy: user.id,
    }).then((intake) => {
      if (!intake) {
        setToast("Failed to create intake. Please try again.");
        return;
      }

      if (form.assignmentComments.trim()) {
        addComment({
          intakeId: intake.id,
          userName: user.name,
          userRole: user.role,
          type: "assignment",
          body: form.assignmentComments.trim(),
        });
      }

      setForm({ ...emptyForm, assignmentDate: new Date().toISOString().slice(0, 10) });
      setToast(`Intake ${intake.intakeNumber} assigned to ${intake.assignedOwner}`);
      window.setTimeout(() => setToast(null), 4000);
    });
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <PageHeader
          title="Assignment Center"
          description="Only Administrators can create and assign new Intakes."
          icon="ri-user-add-line"
        />
        <div className="bg-white rounded-lg border border-slate-200">
          <EmptyState
            icon="ri-shield-keyhole-line"
            title="Access restricted"
            description="You need Administrator permissions to enter and assign Intakes. Switch role from the top-right menu to try the admin experience."
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Assignment Center"
        description="Create a new Intake, enter its COUPA number, and assign an Owner and Backup Owner."
        icon="ri-user-add-line"
      />

      {toast ? (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-md bg-brand-50 border border-brand-200 text-brand-800 text-sm">
          <i className="ri-checkbox-circle-line"></i>
          {toast}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-2 bg-white rounded-lg border border-slate-200 p-6"
        >
          <div className="mb-5 flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-md bg-brand-50 text-brand-700">
              <i className="ri-file-add-line"></i>
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Phase 1 — Assignment</h2>
              <p className="text-xs text-slate-500">
                All fields here populate the assigned user's My Intakes, Database, Tracker and Dashboards automatically.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Intake Number" required hint="From COUPA">
              <input
                className={inputClass}
                placeholder="COUPA-2026-00000"
                value={form.intakeNumber}
                onChange={(e) => update({ intakeNumber: e.target.value })}
              />
            </FormField>

            <FormField label="Priority" required>
              <select
                className={selectClass}
                value={form.priority}
                onChange={(e) => update({ priority: e.target.value as Priority })}
              >
                {PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Request Type" required>
              <select
                className={selectClass}
                value={form.requestType}
                onChange={(e) => update({ requestType: e.target.value })}
              >
                <option value="">Select…</option>
                {dd.request_type.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Line of Business" required>
              <select
                className={selectClass}
                value={form.lineOfBusiness}
                onChange={(e) => update({ lineOfBusiness: e.target.value })}
              >
                <option value="">Select…</option>
                {dd.line_of_business.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Supplier Name" required>
              <input
                className={inputClass}
                value={form.supplierName}
                onChange={(e) => update({ supplierName: e.target.value })}
              />
            </FormField>

            <FormField label="KP Entity" required>
              <select
                className={selectClass}
                value={form.kpEntity}
                onChange={(e) => update({ kpEntity: e.target.value })}
              >
                <option value="">Select…</option>
                {kpEntities.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </FormField>

            <FormField label="FDA Name">
              <input
                className={inputClass}
                value={form.fdaName}
                onChange={(e) => update({ fdaName: e.target.value })}
              />
            </FormField>

            <FormField label="FDA NUID">
              <input
                className={inputClass}
                value={form.fdaNuid}
                onChange={(e) => update({ fdaNuid: e.target.value })}
              />
            </FormField>

            <FormField label="Requester Name" required>
              <input
                className={inputClass}
                value={form.requesterName}
                onChange={(e) => update({ requesterName: e.target.value })}
              />
            </FormField>

            <FormField label="Requester NUID">
              <input
                className={inputClass}
                value={form.requesterNuid}
                onChange={(e) => update({ requesterNuid: e.target.value })}
              />
            </FormField>

            <FormField label="Assigned Owner" required>
              <select
                className={selectClass}
                value={form.assignedOwner}
                onChange={(e) => update({ assignedOwner: e.target.value })}
              >
                <option value="">Select…</option>
                {dd.owner.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Backup Owner">
              <select
                className={selectClass}
                value={form.backupOwner}
                onChange={(e) => update({ backupOwner: e.target.value })}
              >
                <option value="">Select…</option>
                {dd.owner.filter((o) => o !== form.assignedOwner).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Assignment Date" required>
              <input
                type="date"
                className={inputClass}
                value={form.assignmentDate}
                onChange={(e) => update({ assignmentDate: e.target.value })}
              />
            </FormField>

            <FormField label="Assignment Comments" className="md:col-span-2">
              <textarea
                className={inputClass + " resize-none"}
                rows={3}
                maxLength={500}
                value={form.assignmentComments}
                onChange={(e) => update({ assignmentComments: e.target.value })}
                placeholder="Any context, priorities, or handoff notes for the assigned Owner…"
              />
            </FormField>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <i className="ri-information-line"></i>
              Intake will immediately appear in My Intakes, Database, Tracker and Dashboards.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setForm(emptyForm)}
                className="text-sm px-4 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                Reset
              </button>
              <button
                type="submit"
                className="text-sm px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
              >
                <i className="ri-send-plane-fill"></i>
                Assign Intake
              </button>
            </div>
          </div>
        </form>

        <div className="xl:col-span-1 bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Recent Assignments</h3>
            <i className="ri-history-line text-slate-400"></i>
          </div>
          <div className="space-y-3">
            {recent.map((i) => (
              <button
                type="button"
                key={i.id}
                onClick={() => navigate(`/intake/${i.id}`)}
                className="w-full text-left p-3 rounded-md border border-slate-100 hover:border-brand-200 hover:bg-brand-50/40 transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {i.intakeNumber}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{i.supplierName}</div>
                  </div>
                  <PriorityBadge priority={i.priority} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <i className="ri-user-line"></i>
                    {i.assignedOwner}
                  </div>
                  <StatusBadge status={i.status} size="sm" />
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Assigned {formatDate(i.assignmentDate)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
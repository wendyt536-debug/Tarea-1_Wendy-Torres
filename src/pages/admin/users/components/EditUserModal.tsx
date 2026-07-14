import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { Role, User } from "@/types/intake";

const ROLES: Role[] = ["Administrator", "Contracting", "Management", "Requester"];
const JOB_TITLES = ["Contracting Administrator", "Contracting Specialist", "Platform Administrator", "Operations Director"];

interface EditUserModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditUserModal({ open, user, onClose, onSaved }: EditUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nuid, setNuid] = useState("");
  const [role, setRole] = useState<Role>("Requester");
  const [jobTitle, setJobTitle] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
      setNuid(user.nuid ?? "");
      setRole(user.role);
      setJobTitle(user.jobTitle ?? "");
      setActive(user.active);
    }
  }, [user]);

  if (!open || !user) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const patch: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        nuid: nuid.trim() || null,
        role,
        job_title: jobTitle || null,
        active,
        updated_at: new Date().toISOString(),
      };

      const { error: err, data: updated } = await supabase
        .from("users")
        .update(patch)
        .eq("id", user.id)
        .select("id, name, email, role, active, job_title, nuid")
        .single();

      if (err) {
        console.error("EditUserModal update error:", err);
        throw err;
      }

      console.log("EditUserModal updated:", updated);

      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center rounded-md bg-amber-50 text-amber-600">
              <i className="ri-edit-line"></i>
            </div>
            <h3 className="text-base font-semibold text-slate-900">Edit User</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 cursor-pointer"
          >
            <i className="ri-close-line text-slate-500"></i>
          </button>
        </div>

        {error ? (
          <div className="mb-4 px-3 py-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <i className="ri-error-warning-line mt-0.5"></i>
            <span className="flex-1">{error}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">NUID</label>
              <input
                type="text"
                value={nuid}
                onChange={(e) => setNuid(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none cursor-pointer"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Job Title</label>
              <select
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none cursor-pointer"
              >
                <option value="">Select…</option>
                {JOB_TITLES.map((jt) => (
                  <option key={jt} value={jt}>{jt}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Active Status</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="edit-active"
                  checked={active}
                  onChange={() => setActive(true)}
                  className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="edit-active"
                  checked={!active}
                  onChange={() => setActive(false)}
                  className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700">Inactive</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="text-sm px-4 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-sm px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-40"
            >
              {saving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-save-line"></i>}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { Role } from "@/types/intake";

const ROLES: Role[] = ["Administrator", "Contracting", "Management"];
const JOB_TITLES = ["Contracting Administrator", "Contracting Specialist"];

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddUserModal({ open, onClose, onCreated }: AddUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nuid, setNuid] = useState("");
  const [role, setRole] = useState<Role>("Contracting");
  const [jobTitle, setJobTitle] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const specials = "!@#$%&";
    let pwd = "";
    for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    pwd += specials.charAt(Math.floor(Math.random() * specials.length));
    pwd += Math.floor(Math.random() * 10);
    return pwd;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError("Full Name and Email Address are required.");
      return;
    }

    setSaving(true);
    const password = generatePassword();

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        setError("Authentication expired. Please log in again.");
        setSaving(false);
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/admin-users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "create",
            email: email.trim(),
            password,
            name: name.trim(),
            role,
            job_title: jobTitle || null,
            nuid: nuid.trim() || null,
            active,
          }),
        },
      );

      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error ?? "Failed to create user.");
        setSaving(false);
        return;
      }

      onCreated();
      onClose();
      setName("");
      setEmail("");
      setNuid("");
      setRole("Contracting");
      setJobTitle("");
      setActive(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
              <i className="ri-user-add-line"></i>
            </div>
            <h3 className="text-base font-semibold text-slate-900">Add User</h3>
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                placeholder="e.g. Jane Smith"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                placeholder="jane.smith@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">NUID</label>
              <input
                type="text"
                value={nuid}
                onChange={(e) => setNuid(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                placeholder="N100003"
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
            <label className="block text-xs font-medium text-slate-600 mb-2">Active</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="active"
                  checked={active}
                  onChange={() => setActive(true)}
                  className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="active"
                  checked={!active}
                  onChange={() => setActive(false)}
                  className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700">No</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <i className="ri-information-line"></i>
              Creates auth account and profile
            </p>
            <div className="flex items-center gap-2">
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
                disabled={saving || !name.trim() || !email.trim()}
                className="text-sm px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-40"
              >
                {saving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-user-add-line"></i>}
                {saving ? "Creating…" : "Create User"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
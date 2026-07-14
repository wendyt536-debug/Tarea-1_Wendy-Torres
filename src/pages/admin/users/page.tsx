import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/feature/AppLayout";
import PageHeader from "@/components/base/PageHeader";
import { useAuth } from "@/components/feature/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { User as AppUser, Role } from "@/types/intake";

const ROLES: Role[] = ["Administrator", "Contracting", "Management", "Requester"];

const ROLE_COLORS: Record<Role, string> = {
  Administrator: "bg-violet-50 text-violet-700 ring-violet-200",
  Contracting: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Management: "bg-amber-50 text-amber-700 ring-amber-200",
  Requester: "bg-slate-50 text-slate-600 ring-slate-200",
};

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminUsersPage() {
  const { appUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>("Requester");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("users")
        .select("id, name, email, role, active, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setUsers((data as UserRow[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = users.filter((u) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.role ?? "").toLowerCase().includes(q)
    );
  });

  const startEdit = (user: UserRow) => {
    setEditingId(user.id);
    setEditRole(user.role);
    setEditName(user.name ?? "");
    setFeedback(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveUser = async (userId: string) => {
    setSaving(true);
    setFeedback(null);
    try {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      const originalUser = users.find((u) => u.id === userId);
      if (editRole !== originalUser?.role) patch.role = editRole;
      if (editName.trim() !== (originalUser?.name ?? "")) patch.name = editName.trim();

      if (Object.keys(patch).length > 1) {
        const { error: err } = await supabase
          .from("users")
          .update(patch)
          .eq("id", userId);

        if (err) throw err;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, role: editRole, name: editName.trim() || u.name, updated_at: new Date().toISOString() }
            : u,
        ),
      );
      setEditingId(null);
      setFeedback({ type: "success", message: "User updated successfully." });
    } catch (e: unknown) {
      setFeedback({
        type: "error",
        message: e instanceof Error ? e.message : "Failed to update user.",
      });
    } finally {
      setSaving(false);
    }
  };

  const adminCount = users.filter((u) => u.role === "Administrator").length;
  const activeCount = users.filter((u) => u.active).length;

  if (appUser?.role !== "Administrator") {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-amber-50 text-amber-500 mb-4">
            <i className="ri-shield-user-line text-2xl"></i>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Access Restricted</h2>
          <p className="text-sm text-slate-500">Only administrators can manage users.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="User Management"
        description="Manage user accounts and assign roles across the platform."
        icon="ri-group-line"
      />

      {feedback ? (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-start gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <i
            className={`${feedback.type === "success" ? "ri-checkbox-circle-line" : "ri-error-warning-line"} mt-0.5`}
          ></i>
          <span className="flex-1">{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-current opacity-50 hover:opacity-100 cursor-pointer"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
      ) : null}

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, or role…"
                className="w-64 text-sm pl-9 pr-3 py-2 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                <i className="ri-shield-star-line"></i>
                {adminCount} admin{adminCount !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                <i className="ri-user-line"></i>
                {activeCount} active
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="text-sm px-3 py-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
          >
            <i className={`ri-refresh-line ${loading ? "animate-spin" : ""}`}></i>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-slate-400">
              <i className="ri-loader-4-line animate-spin text-lg"></i>
              <span className="text-sm">Loading users…</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-50 text-red-400">
              <i className="ri-error-warning-line text-xl"></i>
            </div>
            <p className="text-sm text-slate-600">{error}</p>
            <button
              type="button"
              onClick={loadUsers}
              className="text-sm px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer whitespace-nowrap"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <i className="ri-user-search-line text-xl"></i>
            </div>
            <p className="text-sm text-slate-500">
              {query ? "No users match your search." : "No users found."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Joined</th>
                  <th className="text-right px-4 py-3 font-medium pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => {
                  const isEditing = editingId === u.id;
                  const isSelf = u.id === appUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-semibold shrink-0">
                            {(u.name || u.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="text-sm w-36 px-2 py-1 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
                                placeholder="User name"
                              />
                            ) : (
                              <div className="text-slate-900 font-medium">
                                {u.name || "—"}
                              </div>
                            )}
                            {isSelf ? (
                              <span className="text-xs text-slate-400">(you)</span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {u.email ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as Role)}
                            className="text-xs px-2 py-1.5 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none cursor-pointer"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ring-1 ${ROLE_COLORS[u.role]}`}
                          >
                            {u.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right pr-6">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => saveUser(u.id)}
                              disabled={saving || (editRole === u.role && editName.trim() === (u.name ?? ""))}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                            >
                              {saving ? (
                                <i className="ri-loader-4-line animate-spin"></i>
                              ) : (
                                <i className="ri-check-line"></i>
                              )}
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={saving}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(u)}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 cursor-pointer whitespace-nowrap transition"
                          >
                            <i className="ri-edit-line"></i>
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filtered.length > 0 ? (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing{" "}
              <span className="font-medium text-slate-700">{filtered.length}</span> user
              {filtered.length !== 1 ? "s" : ""}
            </div>
            <div className="text-slate-400">
              Total: <span className="font-medium text-slate-600">{users.length}</span>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
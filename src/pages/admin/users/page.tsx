import { useEffect, useState, useCallback, useMemo } from "react";
import AppLayout from "@/components/feature/AppLayout";
import PageHeader from "@/components/base/PageHeader";
import { useAuth } from "@/components/feature/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  getUserOpenIntakeCount,
  getUserCompletedThisMonth,
  getWorkloadBadgeClass,
} from "@/lib/store";
import type { User as AppUser, Role } from "@/types/intake";
import ConfirmDialog from "./components/ConfirmDialog";
import AddUserModal from "./components/AddUserModal";
import EditUserModal from "./components/EditUserModal";
import ActionsMenu from "./components/ActionsMenu";
import AssignedIntakesPanel from "./components/AssignedIntakesPanel";
import { useStore } from "@/lib/store";

const ROLES: Role[] = ["Administrator", "Contracting", "Management", "Requester"];

const AVATAR_COLORS = [
  "bg-emerald-600",
  "bg-teal-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-sky-600",
  "bg-violet-600",
  "bg-orange-600",
  "bg-cyan-600",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  nuid?: string;
  jobTitle?: string;
  created_at: string;
  updated_at: string;
}

type ConfirmAction = { type: "toggle-active"; userId: string; userName: string; activate: boolean }
  | { type: "reset-password"; userId: string; userName: string };

export default function AdminUsersPage() {
  const { appUser } = useAuth();
  const store = useStore();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [intakesPanelUser, setIntakesPanelUser] = useState<AppUser | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error: err } = await supabase
        .from("users")
        .select("id, name, email, role, active, nuid, job_title, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (err) throw err;

      const rows: UserRow[] = ((data as Record<string, unknown>[]) ?? []).map((u) => ({
        id: u.id as string,
        name: (u.name as string) ?? "",
        email: (u.email as string) ?? "",
        role: u.role as Role,
        active: (u.active as boolean) ?? true,
        nuid: (u.nuid as string) ?? undefined,
        jobTitle: (u.job_title as string) ?? undefined,
        created_at: (u.created_at as string) ?? "",
        updated_at: (u.updated_at as string) ?? "",
      }));

      setUsers(rows);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // React to store changes (real-time updates)
  useEffect(() => {
    loadUsers();
  }, [store.users.length, loadUsers]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "All" && u.role !== roleFilter) return false;
      if (statusFilter === "Active" && !u.active) return false;
      if (statusFilter === "Inactive" && u.active) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.nuid ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.active).length;

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    window.setTimeout(() => setFeedback(null), 4000);
  };

  // Toggle active status
  const handleToggleActive = async () => {
    if (!confirmAction || confirmAction.type !== "toggle-active") return;
    setConfirmLoading(true);
    try {
      const { error: err } = await supabase
        .from("users")
        .update({ active: confirmAction.activate, updated_at: new Date().toISOString() })
        .eq("id", confirmAction.userId);

      if (err) throw err;
      showFeedback("success", `${confirmAction.userName} ${confirmAction.activate ? "activated" : "deactivated"}.`);
      loadUsers();
    } catch (e: unknown) {
      showFeedback("error", e instanceof Error ? e.message : "Failed to update user status.");
    } finally {
      setConfirmLoading(false);
      setConfirmAction(null);
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!confirmAction || confirmAction.type !== "reset-password") return;
    setConfirmLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Authentication expired.");

      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/admin-users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "reset-password", user_id: confirmAction.userId }),
        },
      );

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error ?? "Failed to send reset email.");
      }

      showFeedback("success", `Password reset email sent to ${confirmAction.userName}.`);
    } catch (e: unknown) {
      showFeedback("error", e instanceof Error ? e.message : "Failed to send reset email.");
    } finally {
      setConfirmLoading(false);
      setConfirmAction(null);
    }
  };

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
        description="Manage user accounts, assign roles, and monitor workload across the platform."
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
          <i className={`${feedback.type === "success" ? "ri-checkbox-circle-line" : "ri-error-warning-line"} mt-0.5`}></i>
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

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 mb-4">
        <div className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or NUID…"
                className="w-56 text-sm pl-9 pr-3 py-2 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition"
              />
            </div>

            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-sm px-3 py-2 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none cursor-pointer"
            >
              <option value="All">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm px-3 py-2 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-3 ml-2 pl-3 border-l border-slate-200">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                <i className="ri-group-line text-slate-400"></i>
                <span className="font-medium text-slate-900">{totalUsers}</span> Total
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                <i className="ri-user-line text-emerald-500"></i>
                <span className="font-medium text-slate-900">{activeCount}</span> Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadUsers}
              disabled={loading}
              className="text-sm px-3 py-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
            >
              <i className={`ri-refresh-line ${loading ? "animate-spin" : ""}`}></i>
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="text-sm px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <i className="ri-user-add-line"></i>
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-slate-400">
              <i className="ri-loader-4-line animate-spin text-lg"></i>
              <span className="text-sm">Loading users…</span>
            </div>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-50 text-red-400">
              <i className="ri-error-warning-line text-xl"></i>
            </div>
            <p className="text-sm text-slate-600">{loadError}</p>
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
              {searchQuery || roleFilter !== "All" || statusFilter !== "All"
                ? "No users match your filters."
                : "No users found."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Job Title</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-center px-4 py-3 font-medium">Workload</th>
                  <th className="text-center px-4 py-3 font-medium hidden md:table-cell">Open</th>
                  <th className="text-center px-4 py-3 font-medium hidden md:table-cell">Comp. This Mo.</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">Joined</th>
                  <th className="text-right px-4 py-3 font-medium pr-6 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => {
                  const isSelf = u.id === appUser?.id;
                  const workload = getUserOpenIntakeCount(u.id, store.intakes);
                  const completedThisMonth = getUserCompletedThisMonth(u.id, store.intakes);
                  const badgeClass = getWorkloadBadgeClass(workload);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 flex items-center justify-center rounded-full ${avatarColor(u.name)} text-white text-xs font-semibold shrink-0`}>
                            {(u.name || u.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-slate-900 font-medium text-sm whitespace-nowrap">
                              {u.name || "—"}
                              {isSelf ? <span className="text-xs text-slate-400 ml-1">(you)</span> : null}
                            </div>
                            {u.nuid ? (
                              <div className="text-xs text-slate-400">{u.nuid}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        <span className="whitespace-nowrap">{u.email ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs hidden lg:table-cell whitespace-nowrap">
                        {u.jobTitle ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                          {workload}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-700 font-medium hidden md:table-cell">
                        {workload}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600 hidden md:table-cell">
                        {completedThisMonth}
                      </td>
                      <td className="px-4 py-3">
                        {u.active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden xl:table-cell whitespace-nowrap">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right pr-6">
                        <ActionsMenu
                          user={{
                            id: u.id,
                            name: u.name ?? "",
                            email: u.email ?? "",
                            role: u.role,
                            active: u.active,
                            jobTitle: u.jobTitle,
                            nuid: u.nuid,
                          }}
                          isSelf={isSelf}
                          onEdit={() => setEditingUser({
                            id: u.id,
                            name: u.name ?? "",
                            email: u.email ?? "",
                            role: u.role,
                            active: u.active,
                            jobTitle: u.jobTitle,
                            nuid: u.nuid,
                          })}
                          onResetPassword={() => setConfirmAction({
                            type: "reset-password",
                            userId: u.id,
                            userName: u.name ?? u.email,
                          })}
                          onToggleActive={() => setConfirmAction({
                            type: "toggle-active",
                            userId: u.id,
                            userName: u.name ?? u.email,
                            activate: !u.active,
                          })}
                          onViewIntakes={() => setIntakesPanelUser({
                            id: u.id,
                            name: u.name ?? "",
                            email: u.email ?? "",
                            role: u.role,
                            active: u.active,
                            jobTitle: u.jobTitle,
                            nuid: u.nuid,
                          })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !loadError && filtered.length > 0 ? (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <span className="font-medium text-slate-700">{filtered.length}</span> of{" "}
              <span className="font-medium text-slate-700">{totalUsers}</span> user{totalUsers !== 1 ? "s" : ""}
            </div>
          </div>
        ) : null}
      </div>

      {/* Modals */}
      <AddUserModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={() => {
          loadUsers();
          showFeedback("success", "User created successfully.");
        }}
      />

      <EditUserModal
        open={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={() => {
          loadUsers();
          showFeedback("success", "User updated successfully.");
        }}
      />

      <AssignedIntakesPanel
        open={!!intakesPanelUser}
        user={intakesPanelUser}
        onClose={() => setIntakesPanelUser(null)}
      />

      <ConfirmDialog
        open={!!confirmAction}
        title={
          confirmAction?.type === "toggle-active"
            ? `${confirmAction.activate ? "Activate" : "Deactivate"} User`
            : "Reset Password"
        }
        message={
          confirmAction?.type === "toggle-active"
            ? `Are you sure you want to ${confirmAction.activate ? "activate" : "deactivate"} ${confirmAction.userName}?`
            : `Send a password reset email to ${confirmAction?.userName ?? "this user"}?`
        }
        confirmLabel={
          confirmAction?.type === "toggle-active"
            ? confirmAction.activate ? "Activate" : "Deactivate"
            : "Send Reset Email"
        }
        danger={confirmAction?.type === "toggle-active" && !confirmAction.activate}
        loading={confirmLoading}
        onConfirm={confirmAction?.type === "toggle-active" ? handleToggleActive : handleResetPassword}
        onCancel={() => setConfirmAction(null)}
      />
    </AppLayout>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const colors: Record<Role, string> = {
    Administrator: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    Contracting: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Management: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Requester: "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${colors[role]}`}>
      {role}
    </span>
  );
}
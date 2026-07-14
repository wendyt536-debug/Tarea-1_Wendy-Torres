import { useSyncExternalStore } from "react";
import { useEffect, useState } from "react";
import type { Intake, IntakeComment, User, CommentType } from "@/types/intake";
import {
  subscribe,
  getStoreSnapshot,
  loadFromSupabase,
  isCacheLoaded,
  createIntakeAsync,
  updateIntakeAsync,
  addCommentAsync,
  getCachedIntakes,
  getCachedComments,
  getCachedUsers,
  getCachedIntake,
  getCachedCommentsForIntake,
  getCachedLatestComment,
  subscribeToRealtime,
  unsubscribeFromRealtime,
} from "@/lib/data";

const EMPTY_SNAPSHOT = { intakes: [] as Intake[], comments: [] as IntakeComment[], users: [] as User[] };

const FALLBACK_USER: User = { id: "unknown", name: "Unknown", email: "", role: "Requester" };

/**
 * Synchronous read via useSyncExternalStore.
 * Data is loaded from Supabase by AppProvider on mount.
 */
export function useStore() {
  return useSyncExternalStore(subscribe, getStoreSnapshot, () => EMPTY_SNAPSHOT);
}

/**
 * Hook: ensures data is loaded from Supabase before rendering children.
 * Returns loading state.
 */
export function useDataLoader(): { loading: boolean; error: string | null } {
  const [loading, setLoading] = useState(!isCacheLoaded());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCacheLoaded()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    loadFromSupabase()
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || "Failed to load data");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    subscribeToRealtime();
    return () => { unsubscribeFromRealtime(); };
  }, []);

  return { loading, error };
}

/* ---------- Current user ---------- */

let currentUserId: string | null = null;

export function setCurrentUser(userId: string | null) {
  currentUserId = userId;
}

export function useCurrentUser(): User {
  const store = useStore();
  if (!currentUserId) {
    const found = store.users[0];
    return found ?? FALLBACK_USER;
  }
  const found = store.users.find((u) => u.id === currentUserId);
  if (found) return found;
  const first = store.users[0];
  return first ?? FALLBACK_USER;
}

/* ---------- Name resolution ---------- */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve an owner/backup-owner value to a display name.
 * If the value looks like a user ID (UUID or mock user ID), look it up in the users table.
 * Otherwise return the value as-is (legacy name strings are still displayed).
 */
export function getUserNameById(ownerValue: string, users: User[]): string {
  if (!ownerValue) return "—";
  // UUID or our mock-id pattern like "user-contract-1"
  const found = users.find((u) => u.id === ownerValue);
  if (found) return found.name;
  // Legacy: value is a plain name string, display as-is
  return ownerValue;
}

/**
 * Returns only active users with the Contracting role, sorted alphabetically.
 * These are the eligible owners for assignment dropdowns.
 */
export function useContractingUsers(): User[] {
  const store = useStore();
  return store.users
    .filter((u) => u.role === "Contracting" && u.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Compute workload for a single user (count of OPEN intakes assigned to them).
 * OPEN = status is NOT Published, Cancelled, or Closed.
 */
export function getUserOpenIntakeCount(userId: string, intakes: Intake[]): number {
  return intakes.filter(
    (i) =>
      i.assignedOwner === userId &&
      i.status !== "Published" &&
      i.status !== "Cancelled" &&
      i.status !== "Closed",
  ).length;
}

/**
 * Compute completed intakes this month for a user.
 */
export function getUserCompletedThisMonth(userId: string, intakes: Intake[]): number {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 7);
  return intakes.filter((i) => {
    if (i.assignedOwner !== userId) return false;
    if (!i.finishingDate) return false;
    const finishedMonth = i.finishingDate.slice(0, 7);
    const isCompleted = i.status === "Published" || i.status === "Closed";
    return finishedMonth === monthStart && isCompleted;
  }).length;
}

/**
 * Workload badge color thresholds.
 */
export function getWorkloadBadgeClass(count: number): string {
  if (count <= 5) return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (count <= 10) return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  if (count <= 15) return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
  return "bg-red-50 text-red-700 ring-1 ring-red-200";
}

/**
 * Returns all active users eligible for Owner/Backup Owner assignment.
 * Includes: Administrators and Contracting users (excludes Management).
 * Sorted by workload (lowest first) for balanced distribution.
 */
export function useAssignableUsers(): User[] {
  const store = useStore();
  return store.users
    .filter((u) => u.active && (u.role === "Administrator" || u.role === "Contracting"))
    .sort((a, b) => {
      const wlA = getUserOpenIntakeCount(a.id, store.intakes);
      const wlB = getUserOpenIntakeCount(b.id, store.intakes);
      return wlA - wlB;
    });
}

/**
 * Get all intakes assigned to a user, categorized by status.
 */
export function getUserIntakesByStatus(userId: string, intakes: Intake[]) {
  const userIntakes = intakes.filter((i) => i.assignedOwner === userId);
  return {
    open: userIntakes.filter((i) => !["Published", "Cancelled", "Closed", "Draft"].includes(i.status)),
    completed: userIntakes.filter((i) => i.status === "Published" || i.status === "Closed"),
    drafts: userIntakes.filter((i) => i.status === "Draft"),
    pendingApprovals: userIntakes.filter((i) => i.status === "Pending Requester" || i.status === "Under Review"),
    published: userIntakes.filter((i) => i.status === "Published"),
    all: userIntakes,
  };
}

/**
 * Get workload display text for a user (e.g. "8 Open Intakes").
 */
export function getWorkloadText(userId: string, intakes: Intake[]): string {
  const count = getUserOpenIntakeCount(userId, intakes);
  return `${count} Open Intake${count !== 1 ? "s" : ""}`;
}

/**
 * Check whether the current user is the owner or backup owner of an intake.
 * Compares by user ID (the authoritative key), falling back to name for legacy data.
 */
export function isUserOwnerOrBackup(intake: { assignedOwner: string; backupOwner: string }, user: User): boolean {
  return intake.assignedOwner === user.id || intake.backupOwner === user.id;
}

/* ---------- Intake CRUD (async Supabase-backed) ---------- */

export async function createIntake(
  data: Omit<Intake, "id" | "createdAt" | "lastUpdated" | "lastUpdatedBy"> & { lastUpdatedBy: string; createdBy?: string },
): Promise<Intake | null> {
  return createIntakeAsync(data);
}

export async function updateIntake(id: string, patch: Partial<Intake>, updatedBy: string): Promise<void> {
  await updateIntakeAsync(id, patch, updatedBy);
}

export function getIntake(id: string): Intake | undefined {
  return getCachedIntake(id);
}

/* ---------- Comments (async Supabase-backed) ---------- */

export async function addComment(
  data: Omit<IntakeComment, "id" | "createdAt">,
): Promise<IntakeComment | null> {
  return addCommentAsync(data);
}

export function getCommentsForIntake(intakeId: string): IntakeComment[] {
  return getCachedCommentsForIntake(intakeId);
}

export function getLatestComment(intakeId: string): IntakeComment | undefined {
  return getCachedLatestComment(intakeId);
}
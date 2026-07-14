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
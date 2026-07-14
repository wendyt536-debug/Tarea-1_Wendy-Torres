import type { Intake, IntakeComment, User, IntakeStatus, Priority, CommentType } from "@/types/intake";
import { supabase } from "@/lib/supabase";
import { SEED_INTAKES, SEED_COMMENTS } from "@/mocks/intakes";

/* ---------- UUID helper ---------- */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(value: string): boolean {
  return UUID_RE.test(value);
}

/* ---------- Mappers: DB snake_case ↔ TS camelCase ---------- */

function dbIntakeToApp(row: Record<string, unknown>): Intake {
  return {
    id: row.intake_id as string,
    intakeNumber: (row.intake_number as string) ?? "",
    requestType: (row.request_type as string) ?? "",
    lineOfBusiness: (row.line_of_business as string) ?? "",
    supplierName: (row.supplier_name as string) ?? "",
    kpEntity: (row.kp_entity as string) ?? "",
    fdaName: (row.fda_name as string) ?? "",
    fdaNuid: (row.fda_nuid as string) ?? "",
    requesterName: (row.requester_name as string) ?? "",
    requesterNuid: (row.requester_nuid as string) ?? "",
    assignedOwner: (row.assigned_owner as string) ?? "",
    backupOwner: (row.backup_owner as string) ?? "",
    assignmentDate: (row.assignment_date as string) ?? "",
    priority: (row.priority as Priority) ?? "Medium",
    assignmentComments: (row.assignment_comments as string) ?? "",
    contractNumber: (row.contract_number as string) ?? "",
    contractType: (row.contract_type as string) ?? "",
    estimatedContractAmount: (row.amount as number | null) ?? null,
    receivedDate: (row.received_date as string) ?? "",
    status: (row.current_status as IntakeStatus) ?? "New",
    finishingDate: (row.finishing_date as string) ?? "",
    rootCause: (row.root_cause as string) ?? "",
    documentsReceived: (row.documents_received as string) ?? "",
    missingInformation: (row.missing_information as string) ?? "",
    internalNotes: (row.internal_notes as string) ?? "",
    followUpNotes: (row.follow_up_notes as string) ?? "",
    finalComments: (row.final_comments as string) ?? "",
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    lastUpdated: (row.updated_at as string) ?? new Date().toISOString(),
    lastUpdatedBy: (row.last_updated_by as string) ?? "",
  };
}

function appIntakeToDb(intake: Partial<Intake> & { id?: string }): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (intake.intakeNumber !== undefined) result.intake_number = intake.intakeNumber;
  if (intake.requestType !== undefined) result.request_type = intake.requestType;
  if (intake.lineOfBusiness !== undefined) result.line_of_business = intake.lineOfBusiness;
  if (intake.supplierName !== undefined) result.supplier_name = intake.supplierName;
  if (intake.kpEntity !== undefined) result.kp_entity = intake.kpEntity;
  if (intake.fdaName !== undefined) result.fda_name = intake.fdaName;
  if (intake.fdaNuid !== undefined) result.fda_nuid = intake.fdaNuid;
  if (intake.requesterName !== undefined) result.requester_name = intake.requesterName;
  if (intake.requesterNuid !== undefined) result.requester_nuid = intake.requesterNuid;
  if (intake.assignedOwner !== undefined) result.assigned_owner = intake.assignedOwner;
  if (intake.backupOwner !== undefined) result.backup_owner = intake.backupOwner;
  if (intake.assignmentDate !== undefined) result.assignment_date = intake.assignmentDate;
  if (intake.priority !== undefined) result.priority = intake.priority;
  if (intake.assignmentComments !== undefined) result.assignment_comments = intake.assignmentComments;
  if (intake.contractNumber !== undefined) result.contract_number = intake.contractNumber;
  if (intake.contractType !== undefined) result.contract_type = intake.contractType;
  if (intake.estimatedContractAmount !== undefined) result.amount = intake.estimatedContractAmount;
  if (intake.receivedDate !== undefined) result.received_date = intake.receivedDate;
  if (intake.status !== undefined) result.current_status = intake.status;
  if (intake.finishingDate !== undefined) result.finishing_date = intake.finishingDate;
  if (intake.rootCause !== undefined) result.root_cause = intake.rootCause;
  if (intake.documentsReceived !== undefined) result.documents_received = intake.documentsReceived;
  if (intake.missingInformation !== undefined) result.missing_information = intake.missingInformation;
  if (intake.internalNotes !== undefined) result.internal_notes = intake.internalNotes;
  if (intake.followUpNotes !== undefined) result.follow_up_notes = intake.followUpNotes;
  if (intake.finalComments !== undefined) result.final_comments = intake.finalComments;
  if (intake.lastUpdatedBy !== undefined) result.last_updated_by = intake.lastUpdatedBy;
  result.updated_at = new Date().toISOString();
  return result;
}

function dbCommentToApp(row: Record<string, unknown>): IntakeComment {
  return {
    id: row.comment_id as string,
    intakeId: row.intake_id as string,
    userName: (row.user_name as string) ?? "Unknown",
    userRole: (row.user_role as string as CommentType) ?? "internal",
    type: (row.type as CommentType) ?? "internal",
    body: (row.comment as string) ?? "",
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
  };
}

/* ---------- In-memory cache ---------- */

let cachedIntakes: Intake[] = [];
let cachedComments: IntakeComment[] = [];
let cachedUsers: User[] = [];
let cacheLoaded = false;

type Listener = () => void;
const listeners = new Set<Listener>();

/* ---------- Memoized snapshot to prevent infinite re-renders ---------- */

let snapshotVersion = 0;
let memoizedSnapshot: { intakes: Intake[]; comments: IntakeComment[]; users: User[] } | null = null;

function emit() {
  snapshotVersion++;
  listeners.forEach((l) => l());
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot() {
  if (!memoizedSnapshot || memoizedSnapshot._v !== snapshotVersion) {
    memoizedSnapshot = {
      intakes: cachedIntakes,
      comments: cachedComments,
      users: cachedUsers,
      _v: snapshotVersion,
    };
  }
  return memoizedSnapshot;
}

export function getStoreSnapshot() {
  return getSnapshot();
}

/* ---------- Load all data from Supabase ---------- */

export async function loadFromSupabase(): Promise<void> {
  try {
    const [intakesRes, commentsRes, usersRes] = await Promise.all([
      supabase.from("intakes").select("*").order("created_at", { ascending: false }),
      supabase.from("comments").select("*").order("created_at", { ascending: false }),
      supabase.from("users").select("id, name, email, role"),
    ]);

    if (intakesRes.data && (intakesRes.data as Record<string, unknown>[]).length > 0) {
      cachedIntakes = (intakesRes.data as Record<string, unknown>[]).map(dbIntakeToApp);
    } else {
      // Fall back to seed data when DB is empty
      cachedIntakes = [...SEED_INTAKES];
    }

    if (commentsRes.data && (commentsRes.data as Record<string, unknown>[]).length > 0) {
      cachedComments = (commentsRes.data as Record<string, unknown>[]).map(dbCommentToApp);
    } else {
      cachedComments = [...SEED_COMMENTS];
    }

    if (usersRes.data && (usersRes.data as Record<string, unknown>[]).length > 0) {
      cachedUsers = (usersRes.data as Record<string, unknown>[]).map((u) => ({
        id: u.id as string,
        name: (u.name as string) ?? (u.email as string)?.split("@")[0] ?? "User",
        email: u.email as string,
        role: u.role as User["role"],
      }));
    }
    cacheLoaded = true;
    emit();
  } catch (err) {
    console.error("Failed to load from Supabase:", err);
    // Fall back to seed data on error
    if (cachedIntakes.length === 0) cachedIntakes = [...SEED_INTAKES];
    if (cachedComments.length === 0) cachedComments = [...SEED_COMMENTS];
    cacheLoaded = true;
    emit();
  }
}

export function isCacheLoaded(): boolean {
  return cacheLoaded;
}

/* ---------- Intake CRUD (Supabase-backed) ---------- */

export async function createIntakeAsync(
  data: Omit<Intake, "id" | "createdAt" | "lastUpdated" | "lastUpdatedBy"> & { createdBy?: string },
): Promise<Intake | null> {
  const dbData = {
    ...appIntakeToDb(data),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (data.createdBy) {
    (dbData as Record<string, unknown>).created_by = data.createdBy;
  }
  (dbData as Record<string, unknown>).current_status = data.status ?? "Draft";

  const { data: rows, error } = await supabase
    .from("intakes")
    .insert(dbData)
    .select()
    .single();

  if (error || !rows) {
    console.error("createIntake error:", error);
    return null;
  }

  const intake = dbIntakeToApp(rows as Record<string, unknown>);
  cachedIntakes = [intake, ...cachedIntakes];
  emit();
  return intake;
}

export async function updateIntakeAsync(id: string, patch: Partial<Intake>, updatedBy: string): Promise<void> {
  // Mock / seed data IDs like "intake-0001" are not real UUIDs — skip DB, update cache only
  if (!isUUID(id)) {
    cachedIntakes = cachedIntakes.map((i) =>
      i.id === id ? { ...i, ...patch, lastUpdated: new Date().toISOString(), lastUpdatedBy: updatedBy } : i,
    );
    emit();
    return;
  }

  const dbPatch = {
    ...appIntakeToDb(patch),
    last_updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("intakes")
    .update(dbPatch)
    .eq("intake_id", id);

  if (error) {
    console.error("updateIntake error:", error);
    return;
  }

  cachedIntakes = cachedIntakes.map((i) =>
    i.id === id ? { ...i, ...patch, lastUpdated: new Date().toISOString(), lastUpdatedBy: updatedBy } : i,
  );
  emit();
}

/* ---------- Comments (Supabase-backed) ---------- */

export async function addCommentAsync(
  data: Omit<IntakeComment, "id" | "createdAt">,
): Promise<IntakeComment | null> {
  // Mock / seed data IDs like "intake-0001" are not real UUIDs — skip DB, update cache only
  if (!isUUID(data.intakeId)) {
    const comment: IntakeComment = {
      id: `c-${Date.now()}`,
      intakeId: data.intakeId,
      userName: data.userName,
      userRole: data.userRole,
      type: data.type,
      body: data.body,
      createdAt: new Date().toISOString(),
    };
    cachedComments = [...cachedComments, comment];
    emit();
    return comment;
  }

  const dbData = {
    intake_id: data.intakeId,
    user_name: data.userName ?? "Unknown",
    user_role: data.userRole,
    type: data.type,
    comment: data.body,
    created_at: new Date().toISOString(),
  };

  const { data: rows, error } = await supabase
    .from("comments")
    .insert(dbData)
    .select()
    .single();

  if (error || !rows) {
    console.error("addComment error:", error);
    return null;
  }

  const comment = dbCommentToApp(rows as Record<string, unknown>);
  cachedComments = [...cachedComments, comment];
  emit();
  return comment;
}

/* ---------- Sync helpers (used by store.ts wrapper) ---------- */

export function getCachedIntakes(): Intake[] {
  return cachedIntakes;
}

export function getCachedComments(): IntakeComment[] {
  return cachedComments;
}

export function getCachedUsers(): User[] {
  return cachedUsers;
}

export function getCachedIntake(id: string): Intake | undefined {
  return cachedIntakes.find((i) => i.id === id);
}

export function getCachedCommentsForIntake(intakeId: string): IntakeComment[] {
  return cachedComments
    .filter((c) => c.intakeId === intakeId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getCachedLatestComment(intakeId: string): IntakeComment | undefined {
  return getCachedCommentsForIntake(intakeId)[0];
}

/* ---------- Real-time subscription (optional, for live updates) ---------- */

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export function subscribeToRealtime() {
  if (realtimeChannel) return;
  realtimeChannel = supabase
    .channel("intakes-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "intakes" },
      () => {
        loadFromSupabase();
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comments" },
      () => {
        loadFromSupabase();
      },
    )
    .subscribe();
}

export function unsubscribeFromRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User as AppUser, Role } from "@/types/intake";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  supabaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const VALID_ROLES: Role[] = ["Administrator", "Contracting", "Management", "Requester"];

function normalizeRole(raw: unknown): Role {
  const trimmed = String(raw ?? "").trim();
  return (VALID_ROLES as string[]).includes(trimmed) ? (trimmed as Role) : "Requester";
}

async function fetchAppUser(supabaseUserId: string, email?: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, active, job_title, nuid, kp_entity")
    .eq("id", supabaseUserId)
    .maybeSingle();

  if (!error && data) {
    return {
      id: data.id,
      name: data.name ?? (email ? email.split("@")[0] : "User"),
      email: data.email ?? email ?? "",
      role: normalizeRole(data.role),
      active: (data.active as boolean) ?? true,
      jobTitle: (data.job_title as string) ?? undefined,
      nuid: (data.nuid as string) ?? undefined,
      kpEntity: (data.kp_entity as string) ?? undefined,
    };
  }

  // Profile row is missing — create it on the fly (trigger may not have run)
  if (email) {
    const { data: created, error: insertErr } = await supabase
      .from("users")
      .insert({ id: supabaseUserId, email, name: email.split("@")[0], role: "Requester", active: true })
      .select("id, name, email, role, active")
      .maybeSingle();

    if (!insertErr && created) {
      return {
        id: created.id,
        name: created.name ?? email.split("@")[0],
        email: created.email ?? email,
        role: normalizeRole(created.role),
        active: (created.active as boolean) ?? true,
        jobTitle: undefined,
      };
    }
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Track the last processed session ID to avoid duplicate processing
  const lastSessionId = useRef<string | null>(null);
  // Track whether initial getSession() has completed to gate onAuthStateChange
  const initialLoadDone = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // Helper: only update state if nothing changed — prevents needless re-renders
    const applyAuthState = (s: Session | null, user: User | null, profile: AppUser | null) => {
      if (cancelled) return;
      const nextSessionId = s?.user?.id ?? null;
      // Skip if we already processed this exact session
      if (nextSessionId === lastSessionId.current && profile !== null) return;
      lastSessionId.current = nextSessionId;
      setSession(s);
      setSupabaseUser(user);
      setAppUser(profile);
    };

    // Step 1: initial session restore (fires once)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return;
      if (s?.user) {
        lastSessionId.current = s.user.id;
        setSession(s);
        setSupabaseUser(s.user);
        fetchAppUser(s.user.id, s.user.email)
          .then((profile) => {
            if (!cancelled) {
              setAppUser(profile);
              initialLoadDone.current = true;
              setLoading(false);
            }
          })
          .catch(() => {
            if (!cancelled) {
              setAppUser(null);
              initialLoadDone.current = true;
              setLoading(false);
            }
          });
      } else {
        initialLoadDone.current = true;
        setLoading(false);
      }
    });

    // Step 2: subscribe to changes (fire-and-forget after initial load)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      if (cancelled) return;

      // During initial mount, getSession() handles it — skip onAuthStateChange
      if (!initialLoadDone.current) return;

      const nextSessionId = s?.user?.id ?? null;
      // Skip if same session we already have
      if (nextSessionId === lastSessionId.current) return;

      lastSessionId.current = nextSessionId;
      setSession(s);
      setSupabaseUser(s?.user ?? null);

      if (s?.user) {
        fetchAppUser(s.user.id, s.user.email)
          .then((profile) => { if (!cancelled) setAppUser(profile); })
          .catch(() => { if (!cancelled) setAppUser(null); });
      } else {
        setAppUser(null);
      }
    });

    return () => {
      cancelled = true;
      initialLoadDone.current = false;
      lastSessionId.current = null;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unable to retrieve user session after sign-in. Please try again." };

    const profile = await fetchAppUser(user.id, user.email);
    if (!profile) return { error: "Unable to load your profile. Please contact an administrator." };

    // onAuthStateChange will fire too — this explicit set ensures immediate consistency
    lastSessionId.current = user.id;
    setAppUser(profile);
    return { error: null };
  };

  const signUp = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const profile = await fetchAppUser(user.id, user.email);
      lastSessionId.current = user.id;
      setAppUser(profile);
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    lastSessionId.current = null;
    setAppUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, supabaseUser, appUser, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
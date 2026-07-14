import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/feature/AuthProvider";

export default function LoginPage() {
  const { signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (mode === "signin") {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
        }
      } else {
        const result = await signUp(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          setSuccessMsg("Account created! Check your email for a confirmation link, then sign in.");
          setMode("signin");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500">
          <i className="ri-loader-4-line animate-spin text-xl"></i>
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600 text-white mb-4">
            <i className="ri-shield-check-line text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Contracting Operations</h1>
          <p className="text-sm text-slate-500 mt-1">Intake Management System</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex rounded-md border border-slate-200 p-0.5 mb-6 bg-slate-50">
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded cursor-pointer whitespace-nowrap transition ${
                mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded cursor-pointer whitespace-nowrap transition ${
                mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign Up
            </button>
          </div>

          {error ? (
            <div className="mb-4 px-3 py-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <i className="ri-error-warning-line mt-0.5"></i>
              <span>{error}</span>
            </div>
          ) : null}

          {successMsg ? (
            <div className="mb-4 px-3 py-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-2">
              <i className="ri-checkbox-circle-line mt-0.5"></i>
              <span>{successMsg}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  {mode === "signin" ? "Signing in…" : "Creating account…"}
                </>
              ) : mode === "signin" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Secure authentication via Supabase. New accounts default to Requester role.
        </p>
      </div>
    </div>
  );
}
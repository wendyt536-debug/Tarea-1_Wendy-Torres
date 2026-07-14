import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { AuthProvider, useAuth } from "@/components/feature/AuthProvider";
import { useDataLoader, setCurrentUser } from "@/lib/store";

function AppInner() {
  const { session, appUser, loading: authLoading } = useAuth();
  const { loading: dataLoading, error: dataError } = useDataLoader();
  const location = useLocation();
  const navigate = useNavigate();
  const lastUserId = useRef<string | null>(null);

  // Auth redirect: use effect-based navigation instead of <Navigate> component
  // to avoid React DOM "removeChild" reconciliation errors
  useEffect(() => {
    if (authLoading || dataLoading) return;

    const isLoginPage = location.pathname === "/login";

    if (!session || !appUser) {
      if (!isLoginPage) {
        navigate("/login", { replace: true });
      }
    } else if (isLoginPage) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, appUser, authLoading, dataLoading, location.pathname, navigate]);

  // Set current user synchronously BEFORE children render so useCurrentUser()
  // has the right user from the very first render. Without this, child pages
  // that call useCurrentUser() before the Header's useEffect fires get the
  // WRONG user (store.users[0] or the "Requester" fallback), which strips
  // admin rights on initial page load.
  if (session && appUser && lastUserId.current !== appUser.id) {
    lastUserId.current = appUser.id;
    setCurrentUser(appUser.id);
  }

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <i className="ri-loader-4-line animate-spin text-2xl text-slate-400"></i>
          <span className="text-sm text-slate-500">
            {authLoading ? "Checking session…" : "Loading data…"}
          </span>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-50 text-red-500">
            <i className="ri-error-warning-line text-2xl"></i>
          </div>
          <p className="text-sm text-slate-900 font-medium mb-1">Failed to load data</p>
          <p className="text-xs text-slate-500 mb-4">{dataError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Don't render routes during redirect transitions (prevents flash of wrong page)
  const isLoginPage = location.pathname === "/login";
  if ((!session || !appUser) && !isLoginPage) return null;
  if (session && appUser && isLoginPage) return null;

  return <AppRoutes />;
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <BrowserRouter basename={__BASE_PATH__}>
          <AppInner />
        </BrowserRouter>
      </AuthProvider>
    </I18nextProvider>
  );
}

export default App;
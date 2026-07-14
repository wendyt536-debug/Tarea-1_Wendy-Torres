import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/components/feature/AuthProvider";
import { useStore, setCurrentUser } from "@/lib/store";
import { useEffect } from "react";

const NAV_ITEMS = [
  { to: "/dashboard", icon: "ri-dashboard-line", label: "Dashboard", roles: ["Administrator", "Contracting", "Management", "Requester"] },
  { to: "/assignment-center", icon: "ri-user-add-line", label: "Assignment Center", roles: ["Administrator"] },
  { to: "/my-intakes", icon: "ri-briefcase-line", label: "My Intakes", roles: ["Contracting", "Administrator"] },
  { to: "/database", icon: "ri-database-2-line", label: "General Database", roles: ["Administrator", "Contracting", "Management", "Requester"] },
  { to: "/reports", icon: "ri-bar-chart-2-line", label: "Reports", roles: ["Administrator", "Contracting", "Management", "Requester"] },
  { to: "/admin/users", icon: "ri-group-line", label: "User Management", roles: ["Administrator"] },
];

export default function Header() {
  const { appUser, signOut } = useAuth();
  const [userMenu, setUserMenu] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  // Sync appUser into the store so useCurrentUser() works on all pages
  useEffect(() => {
    if (appUser) {
      setCurrentUser(appUser.id);
    }
  }, [appUser]);

  const user = appUser;
  const displayName = user ? (user.name || user.email.split("@")[0]) : "User";
  const initials = user
    ? (user.name || user.email)
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || user.email[0].toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="h-16 flex items-center gap-4 px-4 md:px-6">
        <button
          type="button"
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 cursor-pointer"
          onClick={() => setMobileNav((v) => !v)}
          aria-label="Toggle navigation"
        >
          <i className="ri-menu-line text-xl"></i>
        </button>

        <div className="hidden lg:flex items-center gap-2 flex-1">
          <div className="relative w-full max-w-md">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              placeholder="Search intakes, suppliers, contracts…"
              className="w-full text-sm pl-9 pr-3 py-2 rounded-md bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition"
            />
          </div>
        </div>

        <div className="flex-1 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-600 text-white">
              <i className="ri-shield-check-line"></i>
            </div>
            <span className="text-sm font-semibold text-slate-900">Contracting Ops</span>
          </div>
        </div>

        <button
          type="button"
          className="hidden md:flex w-9 h-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 relative cursor-pointer"
          aria-label="Notifications"
        >
          <i className="ri-notification-3-line text-lg"></i>
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        </button>

        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenu((v) => !v)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-semibold">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-slate-900 leading-tight">{displayName}</div>
                <div className="text-xs text-slate-500">{user.role}</div>
              </div>
              <i className="ri-arrow-down-s-line text-slate-400"></i>
            </button>

            {userMenu ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-64 rounded-lg bg-white border border-slate-200 py-2 z-20 shadow-lg">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="text-sm font-medium text-slate-900">{displayName}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                    <div className="mt-1 text-xs text-slate-400">{user.role}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenu(false);
                      signOut();
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <i className="ri-logout-box-line text-slate-400"></i>
                    Sign out
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {mobileNav ? (
        <div className="lg:hidden border-t border-slate-100 px-2 py-2 space-y-1">
          {NAV_ITEMS.filter((n) => n.roles.includes(user?.role ?? "Contracting")).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              onClick={() => setMobileNav(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer ${
                  isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <i className={n.icon}></i>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </div>
      ) : null}
    </header>
  );
}
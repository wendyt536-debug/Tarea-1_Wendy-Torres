import { NavLink } from "react-router-dom";
import { useCurrentUser } from "@/lib/store";

interface NavItem {
  to: string;
  icon: string;
  label: string;
  roles: Array<"Administrator" | "Contracting" | "Management" | "Requester">;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", icon: "ri-dashboard-line", label: "Dashboard", roles: ["Administrator", "Contracting", "Management", "Requester"] },
  { to: "/assignment-center", icon: "ri-user-add-line", label: "Assignment Center", roles: ["Administrator"] },
  { to: "/my-intakes", icon: "ri-briefcase-line", label: "My Intakes", roles: ["Contracting", "Administrator"] },
  { to: "/database", icon: "ri-database-2-line", label: "General Database", roles: ["Administrator", "Contracting", "Management", "Requester"] },
  { to: "/reports", icon: "ri-bar-chart-2-line", label: "Reports & Dashboards", roles: ["Administrator", "Contracting", "Management", "Requester"] },
  { to: "/admin/users", icon: "ri-group-line", label: "User Management", roles: ["Administrator"] },
];

export default function Sidebar() {
  const user = useCurrentUser();
  const items = NAV_ITEMS.filter((n) => n.roles.includes(user.role));

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200 min-h-screen">
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-600 text-white">
            <i className="ri-shield-check-line text-lg"></i>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 leading-tight">Contracting Ops</div>
            <div className="text-xs text-slate-500">Intake Manager</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition cursor-pointer ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
            end
          >
            <i className={`${item.icon} text-lg w-5 h-5 flex items-center justify-center`}></i>
            <span className="whitespace-nowrap">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <i className="ri-information-line"></i>
            <span>Database-first architecture</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-snug">
            All pages read from the same source. Supabase-ready.
          </p>
        </div>
      </div>
    </aside>
  );
}
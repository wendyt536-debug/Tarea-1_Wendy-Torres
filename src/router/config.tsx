import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import DashboardPage from "@/pages/dashboard/page";
import AssignmentCenterPage from "@/pages/assignment-center/page";
import MyIntakesPage from "@/pages/my-intakes/page";
import DatabasePage from "@/pages/database/page";
import ReportsPage from "@/pages/reports/page";
import IntakeDetailPage from "@/pages/intake/page";
import LoginPage from "@/pages/login/page";
import AdminUsersPage from "@/pages/admin/users/page";

const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/assignment-center", element: <AssignmentCenterPage /> },
  { path: "/my-intakes", element: <MyIntakesPage /> },
  { path: "/database", element: <DatabasePage /> },
  { path: "/reports", element: <ReportsPage /> },
  { path: "/admin/users", element: <AdminUsersPage /> },
  { path: "/intake/:id", element: <IntakeDetailPage /> },
  { path: "*", element: <NotFound /> },
];

export default routes;
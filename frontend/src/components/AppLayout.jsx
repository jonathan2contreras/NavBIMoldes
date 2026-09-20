import React from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Box, CalendarRange, FileText, Layers, List, LogOut } from "lucide-react";

import { useRole } from "../context/RoleContext";

const TABS = [
  { to: "/", label: "Modelo 3D", icon: Box, end: true, testId: "tab-viewer" },
  { to: "/objects", label: "Objetos", icon: List, testId: "tab-objects" },
  { to: "/molds", label: "Moldes", icon: Layers, testId: "tab-molds", adminOnly: true },
  { to: "/reports", label: "Reportes", icon: FileText, testId: "tab-reports" },
  { to: "/schedule", label: "Cronograma", icon: CalendarRange, testId: "tab-schedule" },
];

export default function AppLayout() {
  const { role, isAdmin, logout } = useRole();
  const navigate = useNavigate();
  if (!role) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen min-w-0 flex-col bg-white">
      <header className="grid min-h-12 shrink-0 grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2 border-b border-[#D4D4D4] bg-[#E5E5E5] px-3 py-1.5 sm:px-6" data-testid="session-header">
        <span className="col-start-2 text-center text-sm font-semibold text-[#3A3A3C]" data-testid="nav-role-label">
          {role === "admin" ? "Administrador" : "Usuario"}
        </span>
        <button
          data-testid="logout-button"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="col-start-3 flex h-9 w-9 items-center justify-center justify-self-end rounded-full text-[#3A3A3C] transition-colors hover:bg-black/10 focus-visible:outline-[#007AFF]"
        >
          <LogOut size={17} />
        </button>
      </header>
      <nav aria-label="Navegación principal" className="flex min-w-0 shrink-0 flex-nowrap items-center gap-1 overflow-x-auto border-b border-[#E5E5EA] bg-white px-2 py-2 sm:px-6" data-testid="main-nav">
        {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            data-testid={t.testId}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-semibold transition-colors sm:px-3.5 sm:text-[13px] ${
                isActive ? "bg-[#1C1C1E] text-white" : "text-[#3A3A3C] hover:bg-[#F2F2F7]"
              }`
            }
          >
            {t.icon && <t.icon size={15} />}
            {t.label}
          </NavLink>
        ))}
      </nav>
      <main className="min-h-0 min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}

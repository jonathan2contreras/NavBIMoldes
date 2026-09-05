import React from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Box, Camera, FileText, Layers, List, LogOut } from "lucide-react";

import { useRole } from "../context/RoleContext";

const TABS = [
  { to: "/", label: "Modelo 3D", icon: Box, end: true, testId: "tab-viewer" },
  { to: "/objects", label: "Objetos", icon: List, testId: "tab-objects" },
  { to: "/photos", label: "Fotos", icon: Camera, testId: "tab-photos" },
  { to: "/molds", label: "Moldes", icon: Layers, testId: "tab-molds", adminOnly: true },
  { to: "/reports", label: "Reportes", icon: FileText, testId: "tab-reports" },
];

export default function AppLayout() {
  const { role, isAdmin, logout } = useRole();
  const navigate = useNavigate();
  if (!role) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen flex-col bg-white">
      <nav className="flex shrink-0 items-center gap-1 border-b border-[#E5E5EA] bg-white px-4 py-2.5 sm:px-6" data-testid="main-nav">
        {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            data-testid={t.testId}
            className={({ isActive }) =>
              `flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                isActive ? "bg-[#1C1C1E] text-white" : "text-[#3A3A3C] hover:bg-[#F2F2F7]"
              }`
            }
          >
            {t.icon && <t.icon size={15} />}
            {t.label}
          </NavLink>
        ))}
        <span className="ml-auto text-[11px] font-semibold text-[#8E8E93]" data-testid="nav-role-label">
          {role === "admin" ? "Administrador" : "Usuario (solo lectura)"}
        </span>
        <button
          data-testid="logout-button"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F7] transition-opacity hover:opacity-70"
        >
          <LogOut size={16} className="text-[#636366]" />
        </button>
      </nav>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}

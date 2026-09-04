import React from "react";
import { Navigate, NavLink, Outlet } from "react-router-dom";
import { Box, Camera, List, PieChart } from "lucide-react";

import { useRole } from "../context/RoleContext";

const TABS = [
  { to: "/", label: "Modelo 3D", icon: Box, end: true, testId: "tab-viewer" },
  { to: "/objects", label: "Objetos", icon: List, testId: "tab-objects" },
  { to: "/photos", label: "Fotos", icon: Camera, testId: "tab-photos" },
  { to: "/progress", label: "Progreso", icon: PieChart, testId: "tab-progress" },
];

export default function AppLayout() {
  const { role } = useRole();
  if (!role) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen flex-col bg-white">
      <nav className="flex shrink-0 items-center gap-1 border-b border-[#E5E5EA] bg-white px-4 sm:px-6" data-testid="main-nav">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            data-testid={t.testId}
            className={({ isActive }) =>
              `flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
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
      </nav>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}

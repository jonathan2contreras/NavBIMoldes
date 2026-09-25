import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, Box, CalendarRange, ChartGantt, FileText, Layers, List } from "lucide-react";
import BackupControls from "@/components/BackupControls";

const TABS = [
  { to: "/", label: "Modelo 3D", icon: Box, end: true, testId: "tab-viewer" },
  { to: "/objects", label: "Objetos", icon: List, testId: "tab-objects" },
  { to: "/molds", label: "Moldes", icon: Layers, testId: "tab-molds" },
  { to: "/reports", label: "Reportes", icon: FileText, testId: "tab-reports" },
  { to: "/schedule", label: "Fabricación", icon: CalendarRange, testId: "tab-schedule" },
  { to: "/timeline", label: "Línea de tiempo", icon: ChartGantt, testId: "tab-timeline" },
  { to: "/installation", label: "Instalación", icon: CalendarRange, testId: "tab-installation" },
  { to: "/progress", label: "Análisis", icon: BarChart3, testId: "tab-progress" },
];

export default function AppLayout() {
  return (
    <div className="flex h-screen min-w-0 flex-col bg-white">
      <nav aria-label="Navegación principal" className="flex min-w-0 shrink-0 flex-nowrap items-center gap-1 overflow-x-auto border-b border-[#E5E5EA] bg-white px-2 py-2 sm:px-6" data-testid="main-nav">
        {TABS.map((t) => (
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
        <BackupControls />
      </nav>
      <main className="min-h-0 min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}

import React from "react";
import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { RoleProvider } from "@/context/RoleContext";
import { ProjectPanelsProvider } from "@/context/ProjectPanelsContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import ViewerPage from "@/pages/ViewerPage";
import ObjectsPage from "@/pages/ObjectsPage";
import MoldsPage from "@/pages/MoldsPage";
import ReportsPage from "@/pages/ReportsPage";
import SchedulePage from "@/pages/SchedulePage";
import InstallationPage from "@/pages/InstallationPage";
import ProgressPage from "@/pages/ProgressPage";

function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProjectPanelsProvider><AppLayout /></ProjectPanelsProvider>}>
            <Route path="/" element={<ViewerPage />} />
            <Route path="/objects" element={<ObjectsPage />} />
            <Route path="/molds" element={<MoldsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/installation" element={<InstallationPage />} />
            <Route path="/progress" element={<ProgressPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </RoleProvider>
  );
}

export default App;

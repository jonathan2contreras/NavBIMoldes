import React from "react";
import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { RoleProvider, useRole } from "@/context/RoleContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import ViewerPage from "@/pages/ViewerPage";
import ObjectsPage from "@/pages/ObjectsPage";
import PhotosPage from "@/pages/PhotosPage";
import ReportsPage from "@/pages/ReportsPage";

function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<ViewerPage />} />
            <Route path="/objects" element={<ObjectsPage />} />
            <Route path="/photos" element={<PhotosPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </RoleProvider>
  );
}

export default App;

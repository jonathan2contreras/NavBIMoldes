import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

const ProjectPanelsContext = createContext(null);
export const PROJECT_PANELS_CHANGED = "project-panels-changed";

export const ProjectPanelsProvider = ({ children }) => {
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const result = await api.getProjectPanels();
      if (id === requestId.current) { setProject(result); setError(""); }
      return result;
    } catch {
      if (id === requestId.current) setError("No se pudo actualizar el total del proyecto.");
    }
  }, []);
  const discardPending = useCallback(() => { ++requestId.current; }, []);
  useEffect(() => {
    refresh();
    const visibleRefresh = () => { if (document.visibilityState === "visible") refresh(); };
    const timer = window.setInterval(visibleRefresh, 30000);
    window.addEventListener("focus", visibleRefresh);
    document.addEventListener("visibilitychange", visibleRefresh);
    return () => {
      discardPending();
      window.clearInterval(timer);
      window.removeEventListener("focus", visibleRefresh);
      document.removeEventListener("visibilitychange", visibleRefresh);
    };
  }, [refresh, discardPending]);
  const save = async (total) => {
    const result = await api.saveProjectPanels(total);
    ++requestId.current;
    setProject(result);
    setError("");
    window.dispatchEvent(new Event(PROJECT_PANELS_CHANGED));
    return result;
  };
  return <ProjectPanelsContext.Provider value={{ project, error, refresh, save, editorOpen, setEditorOpen }}>{children}</ProjectPanelsContext.Provider>;
};

export const useProjectPanels = () => useContext(ProjectPanelsContext);
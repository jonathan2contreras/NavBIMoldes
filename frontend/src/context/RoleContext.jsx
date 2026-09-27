import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, clearAdminToken, getAdminToken, setAdminToken } from "@/lib/api";

// Everyone can view; editing controls appear only after the shared admin password is entered.
const RoleContext = createContext({ isAdmin: false });

export const RoleProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(() => !!getAdminToken());

  useEffect(() => {
    const onLogout = () => setIsAdmin(false);
    window.addEventListener("admin-logout", onLogout);
    if (getAdminToken()) {
      api.me().then((r) => { if (!r.admin) { clearAdminToken(); setIsAdmin(false); } }).catch(() => {});
    }
    return () => window.removeEventListener("admin-logout", onLogout);
  }, []);

  const login = useCallback(async (password) => {
    const { token } = await api.login(password);
    setAdminToken(token);
    setIsAdmin(true);
  }, []);

  const logout = useCallback(() => {
    clearAdminToken();
    setIsAdmin(false);
  }, []);

  return <RoleContext.Provider value={{ isAdmin, login, logout }}>{children}</RoleContext.Provider>;
};

export const useRole = () => useContext(RoleContext);

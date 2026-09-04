import React, { createContext, useCallback, useContext, useState } from "react";

const KEY = "bim_role";
const TOKEN_KEY = "bim_token";
const RoleContext = createContext(null);

export const RoleProvider = ({ children }) => {
  const [role, setRoleState] = useState(() => localStorage.getItem(KEY) || null);

  const setRole = useCallback((r, token) => {
    localStorage.setItem(KEY, r);
    if (token) localStorage.setItem(TOKEN_KEY, token);
    setRoleState(r);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    localStorage.removeItem(TOKEN_KEY);
    setRoleState(null);
  }, []);

  return (
    <RoleContext.Provider value={{ role, isAdmin: role === "admin", setRole, logout }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);

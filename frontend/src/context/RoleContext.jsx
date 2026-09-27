import React, { createContext, useContext } from "react";

// Keep the existing editing controls enabled in this login-free app.
const access = { isAdmin: true };
const RoleContext = createContext(access);

export const RoleProvider = ({ children }) => (
  <RoleContext.Provider value={access}>{children}</RoleContext.Provider>
);

export const useRole = () => useContext(RoleContext);

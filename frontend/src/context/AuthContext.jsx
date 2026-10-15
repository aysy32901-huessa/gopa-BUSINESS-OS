
import { useCallback, useMemo, useState } from "react";
import AuthContext from "./auth-context.js";
import authService from "../services/authService";

function getSavedSession() {
  try {
    const savedToken = localStorage.getItem("kemetix_token");
    const savedUser = localStorage.getItem("kemetix_user");

    if (savedToken && savedUser) {
      return {
        token: savedToken,
        user: JSON.parse(savedUser),
      };
    }
  } catch {
    localStorage.removeItem("kemetix_token");
    localStorage.removeItem("kemetix_user");
  }

  return {
    token: null,
    user: null,
  };
}

export function AuthProvider({ children }) {
  const [initialSession] = useState(getSavedSession);

  const [user, setUser] = useState(initialSession.user);
  const [token, setToken] = useState(initialSession.token);
  const [loading] = useState(false);

  const saveSession = useCallback((data) => {
    if (!data?.token || !data?.user) {
      throw new Error("Invalid authentication response.");
    }

    localStorage.setItem("kemetix_token", data.token);
    localStorage.setItem("kemetix_user", JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
  }, []);

  const login = useCallback(
    async (credentials) => {
      const result = await authService.login(credentials);

      saveSession(result.data);

      return result;
    },
    [saveSession]
  );

  const register = useCallback(
    async (companyData) => {
      const result = await authService.register(companyData);

      saveSession(result.data);

      return result;
    },
    [saveSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("kemetix_token");
    localStorage.removeItem("kemetix_user");

    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
    }),
    [user, token, loading, login, register, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

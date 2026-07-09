import { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on first load
  useEffect(() => {
    const token = localStorage.getItem("ppp_token");
    if (!token) {
      setLoading(false);
      return;
    }
    client
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem("ppp_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await client.post("/auth/login", { email, password });
    localStorage.setItem("ppp_token", res.data.token);
    // Pull the full user (incl. profileCompleted/photo/…) so first-login gating works
    const me = await client.get("/auth/me").then((r) => r.data.user).catch(() => res.data.user);
    setUser(me);
    return me;
  };

  // Merge fields into the current user (e.g. after completing the profile)
  const updateUser = (patch) => setUser((u) => ({ ...u, ...patch }));

  const logout = () => {
    localStorage.removeItem("ppp_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

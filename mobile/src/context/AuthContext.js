import { createContext, useContext, useEffect, useState } from "react";
import client, { saveToken, getToken, clearToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on app start.
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return setLoading(false);
      try {
        const res = await client.get("/auth/me");
        setUser(res.data.user);
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const res = await client.post("/auth/login", { email, password });
    await saveToken(res.data.token);
    const me = await client.get("/auth/me").then((r) => r.data.user).catch(() => res.data.user);
    setUser(me);
    return me;
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

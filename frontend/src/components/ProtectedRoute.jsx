import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { portalPath } from "../roles";

// Guards a route: requires a logged-in user, optionally with an allowed role.
export default function ProtectedRoute({ allow, children }) {
  const { user, loading } = useAuth();

  if (loading) return null; // could render a spinner
  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role)) {
    // Logged in but wrong panel — send to their own dashboard
    return <Navigate to={portalPath(user.role)} replace />;
  }
  return children;
}

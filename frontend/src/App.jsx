import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import PanelLayout from "./panel/PanelLayout";
import { tabsForRole } from "./panel/tabsConfig";
import EmployeeLayout from "./employee/EmployeeLayout";
import MyAttendancePage from "./employee/tabs/MyAttendancePage";
import MyLeavesPage from "./employee/tabs/MyLeavesPage";
import EmpUpcomingHolidaysPage from "./employee/tabs/EmpUpcomingHolidaysPage";
import EmpSpecialDaysPage from "./employee/tabs/EmpSpecialDaysPage";
import GalleryPage from "./employee/tabs/GalleryPage";
import PolicyPage from "./employee/tabs/PolicyPage";

// Panel tab routes for a given role — Admin gets all tabs, HR a subset.
// Unknown nested paths fall back (absolutely) to the role's first tab.
function panelTabRoutes(role) {
  const tabs = tabsForRole(role);
  const home = `/${role}/${tabs[0].to}`;
  return (
    <>
      <Route index element={<Navigate to={home} replace />} />
      {tabs.map((t) => (
        <Route key={t.to} path={t.to} element={t.element} />
      ))}
      <Route path="*" element={<Navigate to={home} replace />} />
    </>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? `/${user.role}` : "/login"} replace />;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={`/${user.role}`} replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allow={["admin"]}>
                <PanelLayout />
              </ProtectedRoute>
            }
          >
            {panelTabRoutes("admin")}
          </Route>

          <Route
            path="/hr"
            element={
              <ProtectedRoute allow={["hr"]}>
                <PanelLayout />
              </ProtectedRoute>
            }
          >
            {panelTabRoutes("hr")}
          </Route>

          <Route
            path="/employee"
            element={
              <ProtectedRoute allow={["employee"]}>
                <EmployeeLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/employee/attendance" replace />} />
            <Route path="attendance" element={<MyAttendancePage />} />
            <Route path="leaves" element={<MyLeavesPage />} />
            <Route path="upcoming-holidays" element={<EmpUpcomingHolidaysPage />} />
            <Route path="special-days" element={<EmpSpecialDaysPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="policy" element={<PolicyPage />} />
            <Route path="*" element={<Navigate to="/employee/attendance" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

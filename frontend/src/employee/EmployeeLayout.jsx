import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Avatar from "../panel/Avatar";
import CompleteProfile from "./CompleteProfile";
import NoticePopup from "./NoticePopup";
import "../panel/panel.css";
import logo from "../../public/logo.png"

const TABS = [
  { to: "attendance", label: "In / Out", icon: "⏰" },
  { to: "leaves", label: "Leave Application", icon: "📝" },
  { to: "upcoming-holidays", label: "National Holidays", icon: "📅" },
  { to: "special-days", label: "Special Days", icon: "🎉" },
  { to: "gallery", label: "Gallery", icon: "🖼️" },
  { to: "policy", label: "Policy", icon: "📜" },
  {to: "project", label:"Project Management", icon: "📝"}
];

// Sub-items shown in the sidebar ONLY while inside the Project Management section.
const PROJECT_SUBTABS = [
  { to: "project", label: "Home", icon: "🏠", end: true },
  { to: "project/my-tasks", label: "My Tasks", icon: "✅" },
  { to: "project/projects", label: "Projects", icon: "📁" },
  { to: "project/portfolio", label: "Portfolio", icon: "📊" },
];

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const inProject = location.pathname.startsWith("/employee/project");

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // First login: force profile completion before anything else
  if (user && !user.profileCompleted) return <CompleteProfile />;

  return (
    <div className="panel">
      <aside className={`panel-sidebar ${open ? "open" : ""}`}>
        <div className="panel-logo">
          <img src={logo} alt="PPP" />
        </div>
        <nav className="panel-nav">
          {TABS.map((t) => (
            <div key={t.to}>
              <NavLink
                to={t.to}
                end={t.to === "project"}
                className={({ isActive }) => `panel-link ${isActive ? "active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className="panel-link-icon">{t.icon}</span>
                <span>{t.label}</span>
              </NavLink>

              {/* Project Management sub-nav — visible only inside that section */}
              {t.to === "project" && inProject && (
                <div className="panel-subnav">
                  {PROJECT_SUBTABS.map((s) => (
                    <NavLink
                      key={s.to}
                      to={s.to}
                      end={s.end}
                      className={({ isActive }) => `panel-sublink ${isActive ? "active" : ""}`}
                      onClick={() => setOpen(false)}
                    >
                      <span className="panel-link-icon">{s.icon}</span>
                      <span>{s.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <div className="panel-main">
        <header className="panel-topbar">
          <button className="panel-burger" onClick={() => setOpen((o) => !o)}>
            ☰
          </button>
          <div className="panel-topbar-title">Employee Portal</div>
          <div className="panel-user">
            <span className="panel-role">{user?.role}</span>
            <Avatar user={user} size={34} />
            <span className="panel-username">{user?.name}</span>
            <button className="panel-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        <main className="panel-content">
          <Outlet />
        </main>
      </div>
      <NoticePopup />
    </div>
  );
}

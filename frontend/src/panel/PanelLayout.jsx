import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import { tabsForRole } from "./tabsConfig";
import "./panel.css";
import "../employee/pm/pm.css";
import logo from "../../public/logo.png"

// Project Management sub-items — shown in the sidebar only inside that section.
const PROJECT_SUBTABS = [
  { to: "project", label: "Home", icon: "🏠", end: true },
  { to: "project/my-tasks", label: "My Tasks", icon: "✅" },
  { to: "project/projects", label: "Projects", icon: "📁" },
  { to: "project/portfolio", label: "Portfolio", icon: "📊" },
];

export default function PanelLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const tabs = tabsForRole(user?.role);
  const inProject = location.pathname.startsWith(`/${user?.role}/project`);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="panel">
      <aside className={`panel-sidebar ${open ? "open" : ""}`}>
        <div className="panel-logo">
          <img src={logo} alt="PPP" />
        </div>
        <nav className="panel-nav">
          {tabs.map((t) => (
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
          <div className="panel-topbar-title">
            {user?.role === "admin" ? "Admin Panel" : "HR Panel"}
          </div>
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
    </div>
  );
}

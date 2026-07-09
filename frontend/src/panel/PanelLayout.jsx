import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import { tabsForRole } from "./tabsConfig";
import "./panel.css";
import logo from "../../public/logo.png"

export default function PanelLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const tabs = tabsForRole(user?.role);

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
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => `panel-link ${isActive ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="panel-link-icon">{t.icon}</span>
              <span>{t.label}</span>
            </NavLink>
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

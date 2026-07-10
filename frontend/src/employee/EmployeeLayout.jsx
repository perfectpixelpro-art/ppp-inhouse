import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
];

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

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

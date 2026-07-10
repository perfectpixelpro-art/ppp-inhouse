import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../api/client";
import "./Login.css";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setSaving(true);
    try {
      const { data } = await client.post("/auth/reset-password", { token, password });
      setNotice(data.message);
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset your password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img className="login-logo-img" src="/logo.png" alt="PPP" />
          <p className="login-tagline">Employee Management System</p>
        </div>

        <h1 className="login-title">Set a new password</h1>
        <p className="login-subtitle">This link works once and expires in an hour</p>

        <form onSubmit={submit} className="login-form">
          <label className="field">
            <span>New password</span>
            <div className="password-wrap">
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="toggle-pass" onClick={() => setShow((s) => !s)} tabIndex={-1}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repeat it"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}
          {notice && <div className="login-notice">{notice}</div>}

          <button type="submit" className="login-btn" disabled={saving || !!notice}>
            {saving ? "Saving…" : "Update password"}
          </button>
        </form>

        <p className="login-foot">© {new Date().getFullYear()} PPP</p>
      </div>
    </div>
  );
}

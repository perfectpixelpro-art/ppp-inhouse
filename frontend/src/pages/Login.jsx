import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import "./Login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [resetting, setResetting] = useState(false);

  // Self-service reset is admin/HR only; employees are told to contact HR.
  const handleForgot = async () => {
    setError("");
    setNotice("");
    if (!email.trim()) return setError("Enter your email first, then click “Forgot password?”.");
    setResetting(true);
    try {
      const { data } = await client.post("/auth/forgot-password", { email: email.trim() });
      setNotice(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Could not start a password reset.");
    } finally {
      setResetting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      navigate(`/${user.role}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to sign in. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img className="login-logo-img" src="/logo.png" alt="PPP" />
          <p className="login-tagline">Employee Management System</p>
        </div>

        <h1 className="login-title">Sign in</h1>
        <p className="login-subtitle">Admin &amp; HR portal</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              placeholder="you@ppp.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-pass"
                onClick={() => setShowPassword((s) => !s)}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button type="button" className="forgot-link" onClick={handleForgot} disabled={resetting}>
            {resetting ? "Checking…" : "Forgot password?"}
          </button>

          {error && <div className="login-error">{error}</div>}
          {notice && <div className="login-notice">{notice}</div>}

          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="login-foot">© {new Date().getFullYear()} PPP</p>
      </div>
    </div>
  );
}

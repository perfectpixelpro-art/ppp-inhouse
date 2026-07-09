import { useState } from "react";
import { uploadFile, updateMyProfile } from "../api/employee";
import { useAuth } from "../context/AuthContext";
import logo from "../../public/logo.png";

// Shown once, on an employee's first login: they must add photo + birthdate
// (Slack id / phone optional) before the app unlocks.
export default function CompleteProfile() {
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState({
    photo: user?.photo || "",
    birthdate: user?.birthdate ? user.birthdate.slice(0, 10) : "",
    slackUserId: user?.slackUserId || "",
    phone: user?.phone || "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await uploadFile(file);
      setForm((f) => ({ ...f, photo: url }));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.photo || !form.birthdate) {
      setError("Please add a photo and your birthdate.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await updateMyProfile(form);
      updateUser(updated);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-setup">
      <form className="profile-card" onSubmit={submit}>
        <img className="profile-logo" src={logo} alt="PPP" />
        <h2>Welcome, {user?.name?.split(" ")[0]} 👋</h2>
        <p className="profile-sub">Complete your profile to continue.</p>

        {error && <div className="error-banner">{error}</div>}

        <div className="profile-photo-row">
          {form.photo ? (
            <img className="profile-photo" src={form.photo} alt="you" />
          ) : (
            <div className="profile-photo placeholder">📷</div>
          )}
          <label className="btn btn-dark" style={{ cursor: "pointer", margin: 0 }}>
            {uploading ? "Uploading…" : form.photo ? "Change photo" : "Upload photo *"}
            <input type="file" accept="image/*" hidden onChange={handlePhoto} />
          </label>
        </div>

        <div className="form-field full">
          <label>Birthdate *</label>
          <input type="date" value={form.birthdate} onChange={set("birthdate")} required />
        </div>

        <div className="form-field full">
          <label>Phone</label>
          <input value={form.phone} onChange={set("phone")} placeholder="Optional" />
        </div>

        <div className="form-field full">
          <label>Slack user ID</label>
          <input value={form.slackUserId} onChange={set("slackUserId")} placeholder="e.g. U06H1E2GU3H — optional" />
          <span className="profile-hint">Slack → your profile → ⋯ → Copy member ID (needed for shift reminders)</span>
        </div>

        <div className="profile-actions">
          <button type="button" className="btn btn-ghost" onClick={logout}>Logout</button>
          <button className="btn btn-primary" disabled={saving || uploading}>
            {saving ? "Saving…" : "Save & Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}

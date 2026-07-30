import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProjects, createProject, fetchAssignableUsers } from "../../api/pm";
import { useAuth } from "../../context/AuthContext";
import { canSeeAllPM } from "../../roles";
import Modal from "../../panel/Modal";

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", slackChannelId: "", members: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();
  const { user } = useAuth();
  const canCreate = canSeeAllPM(user?.role);

  const load = () => { setLoading(true); fetchProjects().then(setProjects).finally(() => setLoading(false)); };
  useEffect(() => { load(); fetchAssignableUsers().then(setPeople).catch(() => {}); }, []);

  const toggleMember = (id) =>
    setForm((f) => ({ ...f, members: f.members.includes(id) ? f.members.filter((m) => m !== id) : [...f.members, id] }));

  const save = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) { setError("Project name is required"); return; }
    setSaving(true); setError("");
    try {
      const p = await createProject(form);
      setShow(false); setForm({ name: "", description: "", slackChannelId: "", members: [] });
      nav(String(p._id));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Projects</h2>
          <p>Projects you're a member of</p>
        </div>
        {canCreate && <button className="btn btn-primary" onClick={() => { setError(""); setShow(true); }}>+ New Project</button>}
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="pm-empty">No projects yet. Create one to get started.</div>
      ) : (
        <div className="proj-grid">
          {projects.map((p) => {
            const pct = p.stats?.total ? Math.round((p.stats.done / p.stats.total) * 100) : 0;
            return (
              <button key={p._id} className="proj-card" onClick={() => nav(String(p._id))}>
                <div className="proj-name">{p.name}</div>
                <div className="proj-desc">{p.description || "No description"}</div>
                <div className="proj-foot">
                  <span className="proj-members">👥 {p.members?.length || 0}</span>
                  <span className="proj-prog">{p.stats?.done || 0}/{p.stats?.total || 0} done</span>
                </div>
                <div className="proj-bar"><div className="proj-bar-fill" style={{ width: `${pct}%` }} /></div>
              </button>
            );
          })}
        </div>
      )}

      {show && (
        <Modal
          title="New Project"
          onClose={() => setShow(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Creating…" : "Create"}</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form className="form-grid" onSubmit={save}>
            <div className="form-field full">
              <label>Name *</label>
              <input type="text" autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Website Restyling" required />
            </div>
            <div className="form-field full">
              <label>Description</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-field full">
              <label>Slack channel ID *</label>
              <input type="text" value={form.slackChannelId} required
                onChange={(e) => setForm((f) => ({ ...f, slackChannelId: e.target.value }))}
                placeholder="e.g. C06H1SNM01M" />
              <span className="sr-hint">Task start / review / complete updates for this project post to this channel.</span>
            </div>
            <div className="form-field full">
              <label>Members (you're added automatically)</label>
              <div className="member-picker">
                {people.map((p) => (
                  <label key={p._id} className={`member-chip ${form.members.includes(p._id) ? "on" : ""}`}>
                    <input type="checkbox" checked={form.members.includes(p._id)} onChange={() => toggleMember(p._id)} hidden />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

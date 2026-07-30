import { useEffect, useState } from "react";
import Modal from "../../panel/Modal";
import { fetchAssignableUsers, createTask, createTasksBulk } from "../../api/pm";
import { PRIORITIES } from "./pmUtils";
import "./pm.css";

// Create task(s). `defaults` (e.g. { projectId }) seeds the form.
// Single mode = one task; Multiple mode = different tasks to different people
// (and different projects) at once.
export default function TaskModal({ defaults = {}, projects = [], onClose, onSaved }) {
  const [mode, setMode] = useState("single");
  const [people, setPeople] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const newRow = () => ({ title: "", assignedTo: "", projectId: defaults.projectId || "", priority: "medium", dueDate: "" });

  // single-task form
  const [form, setForm] = useState({
    title: "", description: "",
    assignedTo: defaults.assignedTo || "",
    projectId: defaults.projectId || "",
    priority: "medium", startDate: "", dueDate: "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // multiple-task form: a row per task, each with its own person + project
  const [rows, setRows] = useState(() => [newRow(), newRow(), newRow()]);
  const setRow = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((rs) => [...rs, newRow()]);
  const removeRow = (i) => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));

  useEffect(() => { fetchAssignableUsers().then(setPeople).catch(() => {}); }, []);

  const saveSingle = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true); setError("");
    try {
      const saved = await createTask({
        title: form.title, description: form.description,
        assignedTo: form.assignedTo || undefined, projectId: form.projectId || null,
        priority: form.priority, startDate: form.startDate || null, dueDate: form.dueDate || null,
      });
      onSaved?.(saved);
      onClose();
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setSaving(false); }
  };

  const saveBulk = async () => {
    const valid = rows.filter((r) => r.title.trim() && r.assignedTo);
    if (!valid.length) { setError("Add at least one row with a title and an assignee"); return; }
    setSaving(true); setError("");
    try {
      const created = await createTasksBulk(
        valid.map((r) => ({
          title: r.title, assignedTo: r.assignedTo, projectId: r.projectId || null,
          priority: r.priority, dueDate: r.dueDate || null,
        }))
      );
      created.forEach((t) => onSaved?.(t));
      onClose();
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setSaving(false); }
  };

  const submit = mode === "single" ? saveSingle : saveBulk;

  return (
    <Modal
      title="New Task"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : mode === "single" ? "Create" : `Assign ${rows.filter((r) => r.title.trim() && r.assignedTo).length || ""} tasks`}
          </button>
        </>
      }
    >
      {error && <div className="error-banner">{error}</div>}

      <div className="mode-toggle">
        <button className={mode === "single" ? "active" : ""} onClick={() => setMode("single")}>Single</button>
        <button className={mode === "multiple" ? "active" : ""} onClick={() => setMode("multiple")}>Multiple</button>
      </div>

      {mode === "single" ? (
        <form className="form-grid" onSubmit={(e) => { e.preventDefault(); saveSingle(); }}>
          <div className="form-field full">
            <label>Title *</label>
            <input type="text" autoFocus value={form.title} onChange={set("title")} placeholder="e.g. Design homepage" required />
          </div>
          <div className="form-field full">
            <label>Description</label>
            <textarea rows={2} value={form.description} onChange={set("description")} />
          </div>
          <div className="form-field">
            <label>Assign to</label>
            <select value={form.assignedTo} onChange={set("assignedTo")}>
              <option value="">Me</option>
              {people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Project</label>
            <select value={form.projectId} onChange={set("projectId")}>
              <option value="">None (standalone)</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Priority</label>
            <select value={form.priority} onChange={set("priority")}>
              {PRIORITIES.map((p) => <option key={p} value={p} style={{ textTransform: "capitalize" }}>{p}</option>)}
            </select>
          </div>
          <div className="form-field" />
          <div className="form-field">
            <label>Start date &amp; time</label>
            <input type="datetime-local" value={form.startDate} onChange={set("startDate")} />
          </div>
          <div className="form-field">
            <label>End date &amp; time</label>
            <input type="datetime-local" value={form.dueDate} onChange={set("dueDate")} />
          </div>
        </form>
      ) : (
        <div className="bulk">
          <p className="bulk-hint">Assign different tasks to different people — each row can have its own project.</p>
          {rows.map((r, i) => (
            <div className="bulk-card" key={i}>
              <div className="bulk-card-top">
                <span className="bulk-num">Task {i + 1}</span>
                {rows.length > 1 && <button className="bulk-x" type="button" onClick={() => removeRow(i)} title="Remove">✕</button>}
              </div>
              <input className="bulk-title" placeholder="Task title" value={r.title} onChange={(e) => setRow(i, "title", e.target.value)} />
              <div className="bulk-fields">
                <label className="bulk-field">
                  <span>Assign to</span>
                  <select value={r.assignedTo} onChange={(e) => setRow(i, "assignedTo", e.target.value)}>
                    <option value="">Pick person…</option>
                    {people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </label>
                <label className="bulk-field">
                  <span>Project</span>
                  <select value={r.projectId} onChange={(e) => setRow(i, "projectId", e.target.value)}>
                    <option value="">None</option>
                    {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </label>
                <label className="bulk-field">
                  <span>Priority</span>
                  <select value={r.priority} onChange={(e) => setRow(i, "priority", e.target.value)}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label className="bulk-field">
                  <span>Due date &amp; time</span>
                  <input type="datetime-local" value={r.dueDate} onChange={(e) => setRow(i, "dueDate", e.target.value)} />
                </label>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm bulk-add" type="button" onClick={addRow}>+ Add another task</button>
        </div>
      )}
    </Modal>
  );
}

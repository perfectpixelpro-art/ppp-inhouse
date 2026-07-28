import { useEffect, useState } from "react";
import Modal from "../../panel/Modal";
import { fetchAssignableUsers, createTask, updateTask } from "../../api/pm";
import { STATUSES, PRIORITIES, STATUS_LABEL, ymd } from "./pmUtils";

// Create or edit a task. Pass `task` to edit, or `defaults` (e.g. { projectId })
// to seed a new one. `projectLocked` hides the project note when inside a project.
export default function TaskModal({ task, defaults = {}, projects = [], onClose, onSaved }) {
  const editing = !!task;
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    assignedTo: task?.assignedTo?._id || task?.assignedTo || defaults.assignedTo || "",
    projectId: task?.projectId?._id || task?.projectId || defaults.projectId || "",
    priority: task?.priority || "medium",
    status: task?.status || "todo",
    startDate: task?.startDate ? ymd(task.startDate) : "",
    dueDate: task?.dueDate ? ymd(task.dueDate) : "",
    timeSpent: task?.timeSpent || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchAssignableUsers().then(setPeople).catch(() => {}); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e?.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    const payload = {
      title: form.title,
      description: form.description,
      assignedTo: form.assignedTo || undefined,
      projectId: form.projectId || null,
      priority: form.priority,
      status: form.status,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
      timeSpent: Number(form.timeSpent) || 0,
    };
    try {
      const saved = editing ? await updateTask(task._id, payload) : await createTask(payload);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? "Edit Task" : "New Task"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save" : "Create"}
          </button>
        </>
      }
    >
      {error && <div className="error-banner">{error}</div>}
      <form className="form-grid" onSubmit={save}>
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
        <div className="form-field">
          <label>Status</label>
          <select value={form.status} onChange={set("status")}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Start date</label>
          <input type="date" value={form.startDate} onChange={set("startDate")} />
        </div>
        <div className="form-field">
          <label>Due date</label>
          <input type="date" value={form.dueDate} onChange={set("dueDate")} />
        </div>
        <div className="form-field">
          <label>Time spent (minutes)</label>
          <input type="number" min="0" step="5" value={form.timeSpent} onChange={set("timeSpent")} />
        </div>
      </form>
    </Modal>
  );
}

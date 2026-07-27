import { useEffect, useMemo, useState } from "react";
import {
  myTasks,
  tasksAssignedByMe,
  fetchAssignableUsers,
  createTask,
  setTaskStatus,
  deleteTask,
} from "../../api/employee";
import { fmtDate } from "../../panel/utils";
import Modal from "../../panel/Modal";
import "./tasks.css";

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const isOverdue = (t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < startOfToday();
const blank = { title: "", assignedTo: "", dueDate: "" };

const STATUS_LABEL = { todo: "To-do", in_progress: "In progress", done: "Done" };
const NEXT = { todo: "in_progress", in_progress: "done", done: "todo" };

export default function MyTasksPage() {
  const [scope, setScope] = useState("me"); // "me" = assigned to me · "byme" = I assigned
  const [view, setView] = useState("upcoming"); // upcoming | overdue | completed
  const [tasks, setTasks] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    (scope === "me" ? myTasks() : tasksAssignedByMe())
      .then(setTasks)
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [scope]);
  useEffect(() => { fetchAssignableUsers().then(setPeople).catch(() => {}); }, []);

  const buckets = useMemo(() => {
    const overdue = tasks.filter(isOverdue);
    const completed = tasks.filter((t) => t.status === "done");
    const upcoming = tasks.filter((t) => t.status !== "done" && !isOverdue(t));
    return { upcoming, overdue, completed };
  }, [tasks]);

  const list = buckets[view] || [];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createTask(form);
      setShow(false);
      setForm(blank);
      setScope("byme"); // jump to what I just delegated
      if (scope === "byme") load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const cycle = async (t) => {
    setError("");
    try {
      const updated = await setTaskStatus(t._id, NEXT[t.status]);
      setTasks((ts) => ts.map((x) => (x._id === t._id ? { ...x, ...updated } : x)));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const toggleDone = async (t) => {
    setError("");
    try {
      const updated = await setTaskStatus(t._id, t.status === "done" ? "todo" : "done");
      setTasks((ts) => ts.map((x) => (x._id === t._id ? { ...x, ...updated } : x)));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const remove = async (t) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await deleteTask(t._id);
      setTasks((ts) => ts.filter((x) => x._id !== t._id));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const counts = { upcoming: buckets.upcoming.length, overdue: buckets.overdue.length, completed: buckets.completed.length };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Project Management</h2>
          <p>Your tasks — assign work to anyone and track what's due</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(blank); setError(""); setShow(true); }}>+ Assign Task</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="scope-toggle">
        <button className={scope === "me" ? "active" : ""} onClick={() => { setScope("me"); setView("upcoming"); }}>
          My tasks
        </button>
        <button className={scope === "byme" ? "active" : ""} onClick={() => { setScope("byme"); setView("upcoming"); }}>
          Assigned by me
        </button>
      </div>

      <div className="task-tabs">
        {["upcoming", "overdue", "completed"].map((v) => (
          <button key={v} className={`task-tab ${view === v ? "active" : ""} ${v === "overdue" && counts.overdue ? "danger" : ""}`} onClick={() => setView(v)}>
            {v === "upcoming" ? "Upcoming" : v === "overdue" ? "Overdue" : "Completed"}
            <span className="task-count">{counts[v]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : list.length === 0 ? (
        <div className="task-empty">
          {view === "overdue" ? "Nothing overdue. 🎉" : view === "completed" ? "No completed tasks yet." : "No tasks here."}
        </div>
      ) : (
        <ul className="task-list">
          {list.map((t) => {
            const other = scope === "me" ? t.assignedBy : t.assignedTo;
            return (
              <li key={t._id} className={`task-row ${t.status === "done" ? "done" : ""}`}>
                <button className={`task-check ${t.status === "done" ? "checked" : ""}`} title="Toggle done" onClick={() => toggleDone(t)}>
                  {t.status === "done" ? "✓" : ""}
                </button>
                <div className="task-body">
                  <div className="task-title">{t.title}</div>
                  <div className="task-meta">
                    <button className={`status-chip s-${t.status}`} onClick={() => cycle(t)} title="Click to advance status">
                      {STATUS_LABEL[t.status]}
                    </button>
                    {t.dueDate && (
                      <span className={`due ${isOverdue(t) ? "overdue" : ""}`}>📅 {fmtDate(t.dueDate)}</span>
                    )}
                    <span className="task-who">
                      {scope === "me" ? "from" : "for"} <strong>{other?.name || "—"}</strong>
                    </span>
                  </div>
                </div>
                {scope === "byme" && (
                  <button className="task-del" title="Delete task" onClick={() => remove(t)}>🗑</button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {show && (
        <Modal
          title="Assign a Task"
          onClose={() => setShow(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Assigning…" : "Assign"}</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form className="form-grid" onSubmit={save}>
            <div className="form-field full">
              <label>Task *</label>
              <input type="text" autoFocus value={form.title} onChange={set("title")} placeholder="e.g. Create logo mockup" required />
            </div>
            <div className="form-field">
              <label>Assign to *</label>
              <select value={form.assignedTo} onChange={set("assignedTo")} required>
                <option value="">Pick a person…</option>
                {people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Due date</label>
              <input type="date" value={form.dueDate} onChange={set("dueDate")} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

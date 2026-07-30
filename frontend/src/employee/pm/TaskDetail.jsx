import { useEffect, useState } from "react";
import {
  fetchTask, updateTask, addTaskComment, createTask, deleteTask, fetchProjectTasks,
  fetchAssignableUsers, addDependency as apiAddDependency, removeDependency as apiRemoveDependency,
  requestChanges as apiRequestChanges,
} from "../../api/pm";
import { useAuth } from "../../context/AuthContext";
import { canSeeAllPM } from "../../roles";
import Avatar from "../../panel/Avatar";
import SubmitReviewModal from "./SubmitReviewModal";
import {
  STATUS_LABEL, STATUSES, PRIORITIES, PRIORITY_COLOR, fmtMs, fmtDateTime, isClosed, downloadUrl,
} from "./pmUtils";

// Asana-style task detail drawer: description, status/review, dependencies,
// subtasks and a comment thread. props: id, onClose, onChanged(task)
export default function TaskDetail({ id, onClose, onChanged }) {
  const { user } = useAuth();
  const staff = canSeeAllPM(user?.role);

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [subInput, setSubInput] = useState("");
  const [subAssignee, setSubAssignee] = useState("");
  const [depForm, setDepForm] = useState({ kind: "task", target: "", reason: "" });
  const [projTasks, setProjTasks] = useState([]);
  const [people, setPeople] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesNote, setChangesNote] = useState("");

  const load = () => {
    setLoading(true);
    fetchTask(id)
      .then(setTask)
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (task?.projectId?._id) fetchProjectTasks(task.projectId._id).then(setProjTasks).catch(() => {});
  }, [task?.projectId?._id]);
  useEffect(() => { fetchAssignableUsers().then(setPeople).catch(() => {}); }, []);

  const patch = async (data) => {
    setError("");
    try {
      const updated = await updateTask(id, data);
      onChanged?.(updated);
      load();
    } catch (e) { setError(e.response?.data?.message || e.message); }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    const text = comment.trim();
    if (!text) return;
    setComment("");
    try { await addTaskComment(id, text); load(); }
    catch (er) { setError(er.response?.data?.message || er.message); }
  };

  const addSubtask = async (e) => {
    e.preventDefault();
    const title = subInput.trim();
    if (!title) return;
    setSubInput("");
    // Assign to the chosen person (a real task in their list + the project), or
    // default to the parent task's assignee.
    const assignedTo = subAssignee || task.assignedTo?._id;
    try {
      await createTask({ title, projectId: task.projectId?._id || null, assignedTo, parentTask: id });
      setSubAssignee("");
      load();
    } catch (er) { setError(er.response?.data?.message || er.message); }
  };

  const toggleSub = async (st) => {
    try { await updateTask(st._id, { status: st.status === "done" ? "todo" : "done" }); load(); onChanged?.(); }
    catch (er) { setError(er.response?.data?.message || er.message); }
  };
  const removeSub = async (st) => {
    if (!window.confirm("Delete this subtask?")) return;
    try { await deleteTask(st._id); load(); onChanged?.(); }
    catch (er) { setError(er.response?.data?.message || er.message); }
  };

  const addDep = async () => {
    if (!depForm.target) return;
    setError("");
    try {
      const payload = { kind: depForm.kind, reason: depForm.reason };
      if (depForm.kind === "task") payload.task = depForm.target; else payload.person = depForm.target;
      await apiAddDependency(id, payload);
      setDepForm({ kind: depForm.kind, target: "", reason: "" });
      load();
    } catch (e) { setError(e.response?.data?.message || e.message); }
  };
  const removeDep = async (depId) => {
    try { await apiRemoveDependency(id, depId); load(); }
    catch (e) { setError(e.response?.data?.message || e.message); }
  };

  const sendChanges = async () => {
    const note = changesNote.trim();
    if (!note) return;
    setError("");
    try {
      const u = await apiRequestChanges(id, note);
      onChanged?.(u);
      setChangesOpen(false); setChangesNote("");
      load();
    } catch (e) { setError(e.response?.data?.message || e.message); }
  };

  const canTouch = staff || task?.assignedTo?._id === user?._id;
  const depTaskOptions = projTasks.filter(
    (pt) => pt._id !== id && pt.parentTask == null &&
      !(task?.dependencies || []).some((d) => d.kind === "task" && d.task?._id === pt._id)
  );
  const depPeopleOptions = people.filter(
    (p) => !(task?.dependencies || []).some((d) => d.kind === "person" && d.person?._id === p._id)
  );

  const Person = ({ u }) => (
    <div className="td-person">{u ? <><Avatar user={u} size={22} /><span>{u.name}</span></> : "—"}</div>
  );

  return (
    <>
    <div className="td-overlay" onClick={onClose}>
      <div className="td-panel" onClick={(e) => e.stopPropagation()}>
        <div className="td-head">
          <span className={`status-chip s-${task?.status || "todo"}`}>{STATUS_LABEL[task?.status] || "—"}</span>
          <button className="td-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="loading" style={{ padding: 24 }}>Loading…</div>
        ) : error && !task ? (
          <div className="error-banner" style={{ margin: 16 }}>{error}</div>
        ) : task ? (
          <div className="td-body">
            {error && <div className="error-banner">{error}</div>}

            {staff ? (
              <input className="td-title-input" defaultValue={task.title}
                onBlur={(e) => e.target.value.trim() && e.target.value !== task.title && patch({ title: e.target.value })} />
            ) : (
              <h2 className="td-title">{task.title}</h2>
            )}

            <div className="td-meta">
              <div className="td-row"><span className="td-label">Assignee</span><Person u={task.assignedTo} /></div>
              <div className="td-row"><span className="td-label">Assigned by</span><Person u={task.assignedBy} /></div>
              <div className="td-row"><span className="td-label">Project</span><span className="td-value">{task.projectId?.name || "—"}</span></div>
              <div className="td-row">
                <span className="td-label">Priority</span>
                {staff ? (
                  <select value={task.priority} onChange={(e) => patch({ priority: e.target.value })}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <span className="td-value"><span className="prio-dot" style={{ background: PRIORITY_COLOR[task.priority] }} />{task.priority}</span>
                )}
              </div>
              <div className="td-row"><span className="td-label">Start</span><span className="td-value">{fmtDateTime(task.startDate)}</span></div>
              <div className="td-row"><span className="td-label">Due</span><span className="td-value">{fmtDateTime(task.dueDate)}</span></div>
              <div className="td-row">
                <span className="td-label">Worked time</span>
                <span className="td-value">{task.activeMs ? fmtMs(task.activeMs) : (task.startedAt && !isClosed(task) ? "running…" : "—")}</span>
              </div>
              <div className="td-row">
                <span className="td-label">Review time</span>
                <span className="td-value">{fmtMs(task.reviewMs)}</span>
              </div>
            </div>

            <div className="td-section">
              <div className="td-section-title">Status</div>
              <div className="td-actions">
                {staff ? (
                  <select value={task.status} onChange={(e) => patch({ status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                ) : (
                  <span className={`status-chip s-${task.status}`}>{STATUS_LABEL[task.status]}</span>
                )}

                {/* Employee actions: Start · Submit for review · Complete */}
                {canTouch && !staff && task.status === "todo" && (
                  <button className="btn btn-primary btn-sm" onClick={() => patch({ status: "in_progress" })}>▶ Start</button>
                )}
                {canTouch && task.status === "in_progress" && (
                  <button className="btn btn-primary btn-sm" onClick={() => setReviewOpen(true)}>Submit for review</button>
                )}
                {canTouch && !staff && (task.status === "in_progress" || task.status === "approved") && (
                  <button className="btn btn-sm btn-approve" onClick={() => patch({ status: "done" })}>✓ Complete</button>
                )}
                {canTouch && !staff && task.status === "in_review" && <span className="td-hint">Awaiting review…</span>}

                {/* Staff review decision */}
                {staff && task.status === "in_review" && (
                  <>
                    <button className="btn btn-sm btn-approve" onClick={() => patch({ status: "approved" })}>Approve &amp; complete</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setChangesOpen((o) => !o)}>Request changes</button>
                  </>
                )}
                {task.reviewedBy && isClosed(task) && <span className="td-hint">Reviewed by {task.reviewedBy.name}</span>}
              </div>
              {staff && changesOpen && (
                <div className="td-changes">
                  <textarea rows={3} value={changesNote} autoFocus
                    onChange={(e) => setChangesNote(e.target.value)}
                    placeholder="What needs changing? This is sent to the assignee on Slack and added as a comment." />
                  <div className="td-changes-row">
                    <button className="btn btn-ghost btn-sm" onClick={() => { setChangesOpen(false); setChangesNote(""); }}>Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={sendChanges} disabled={!changesNote.trim()}>Send changes</button>
                  </div>
                </div>
              )}
            </div>

            {/* Review submission — what the assignee turned in */}
            {task.submission?.submittedAt && (
              <div className="td-section">
                <div className="td-section-title">Submitted for review</div>
                <div className="sr-view">
                  <div className="td-hint">
                    by {task.submission.submittedBy?.name || task.assignedTo?.name} · {fmtDateTime(task.submission.submittedAt)}
                  </div>
                  {task.submission.note && <p className="sr-note">{task.submission.note}</p>}
                  {task.submission.links?.length > 0 && (
                    <ul className="sr-list">
                      {task.submission.links.map((l, i) => (
                        <li key={i}>🔗 <a href={l} target="_blank" rel="noreferrer">{l}</a></li>
                      ))}
                    </ul>
                  )}
                  {task.submission.files?.length > 0 && (
                    <div className="sr-files">
                      {task.submission.files.map((f, i) => (
                        <div key={i} className="sr-file">
                          {f.kind === "image" ? (
                            <a href={f.url} target="_blank" rel="noreferrer" className="sr-thumb">
                              <img src={f.url} alt={f.name || "attachment"} />
                            </a>
                          ) : (
                            <a href={f.url} target="_blank" rel="noreferrer" className="sr-fchip">
                              {f.kind === "video" ? "🎬" : "📄"} {f.name || "file"}
                            </a>
                          )}
                          <a className="sr-dl" href={downloadUrl(f.url)} download={f.name || ""} target="_blank" rel="noreferrer" title="Download">⬇</a>
                        </div>
                      ))}
                    </div>
                  )}
                  {task.reviewers?.length > 0 && (
                    <div className="sr-reviewers">
                      <span className="td-hint">Reviewers:</span>
                      {task.reviewers.map((r) => (
                        <span key={r._id} className="sr-rev"><Avatar user={r} size={20} />{r.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="td-section">
              <div className="td-section-title">Description</div>
              {staff ? (
                <textarea className="td-desc" defaultValue={task.description}
                  placeholder="What is this task about?"
                  onBlur={(e) => e.target.value !== task.description && patch({ description: e.target.value })} />
              ) : (
                <div className="td-desc-ro">{task.description || <span className="td-hint">No description</span>}</div>
              )}
            </div>

            <div className="td-section">
              <div className="td-section-title">Dependencies · blocked by</div>
              {(task.dependencies || []).length === 0 && <div className="td-hint">None</div>}
              <ul className="td-list">
                {(task.dependencies || []).map((d) => (
                  <li key={d._id} className="td-dep">
                    {d.kind === "task" ? (
                      <>
                        <span className={`status-chip sm s-${d.task?.status || "todo"}`}>{STATUS_LABEL[d.task?.status] || "—"}</span>
                        <span>{d.task?.title || "Task"}</span>
                      </>
                    ) : (
                      <>
                        <Avatar user={d.person} size={22} />
                        <span>{d.person?.name || "Person"}</span>
                        {d.task && <span className={`status-chip sm s-${d.task.status || "todo"}`}>{STATUS_LABEL[d.task.status] || "—"}</span>}
                        <span className="td-dep-tag">person</span>
                      </>
                    )}
                    {d.reason && <span className="td-dep-reason">— {d.reason}</span>}
                    {canTouch && <button className="td-x" onClick={() => removeDep(d._id)}>✕</button>}
                  </li>
                ))}
              </ul>
              {canTouch && (
                <div className="td-dep-add">
                  <div className="td-dep-kind">
                    <button type="button" className={depForm.kind === "task" ? "active" : ""}
                      onClick={() => setDepForm((f) => ({ ...f, kind: "task", target: "" }))}>Task</button>
                    <button type="button" className={depForm.kind === "person" ? "active" : ""}
                      onClick={() => setDepForm((f) => ({ ...f, kind: "person", target: "" }))}>Person</button>
                  </div>
                  <select value={depForm.target} onChange={(e) => setDepForm((f) => ({ ...f, target: e.target.value }))}>
                    <option value="">{depForm.kind === "task" ? "Pick a task…" : "Pick a person…"}</option>
                    {depForm.kind === "task"
                      ? depTaskOptions.map((pt) => <option key={pt._id} value={pt._id}>{pt.title}</option>)
                      : depPeopleOptions.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                  <input placeholder="Reason (optional) — e.g. waiting on the design"
                    value={depForm.reason} onChange={(e) => setDepForm((f) => ({ ...f, reason: e.target.value }))} />
                  <button type="button" className="btn btn-sm btn-primary" onClick={addDep} disabled={!depForm.target}>Add dependency</button>
                </div>
              )}
            </div>

            <div className="td-section">
              <div className="td-section-title">Subtasks</div>
              {(task.subtasks || []).length === 0 && <div className="td-hint">No subtasks</div>}
              <ul className="td-list">
                {(task.subtasks || []).map((st) => (
                  <li key={st._id} className="td-sub">
                    <button className={`task-check ${st.status === "done" ? "checked" : ""}`} onClick={() => toggleSub(st)}>
                      {st.status === "done" ? "✓" : ""}
                    </button>
                    <span className={st.status === "done" ? "td-sub-done" : ""}>{st.title}</span>
                    <span className="td-sub-who">{st.assignedTo?.name || ""}</span>
                    {canTouch && <button className="td-x" onClick={() => removeSub(st)}>🗑</button>}
                  </li>
                ))}
              </ul>
              {canTouch && (
                <form className="td-subtask-add" onSubmit={addSubtask}>
                  <input value={subInput} onChange={(e) => setSubInput(e.target.value)} placeholder="Subtask title…" />
                  <div className="td-subtask-row">
                    <select value={subAssignee} onChange={(e) => setSubAssignee(e.target.value)}>
                      <option value="">Assign to {task.assignedTo?.name || "assignee"} (default)</option>
                      {people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                    <button className="btn btn-sm btn-primary" type="submit" disabled={!subInput.trim()}>Add subtask</button>
                  </div>
                </form>
              )}
            </div>

            <div className="td-section">
              <div className="td-section-title">Comments</div>
              <ul className="td-comments">
                {(task.comments || []).map((c) => (
                  <li key={c._id} className="td-comment">
                    <Avatar user={c.author} size={30} />
                    <div className="td-comment-body">
                      <div className="td-comment-head">
                        <strong>{c.author?.name || "—"}</strong>
                        <span className="td-hint">{fmtDateTime(c.createdAt)}</span>
                      </div>
                      <div className="td-comment-text">{c.text}</div>
                    </div>
                  </li>
                ))}
                {(task.comments || []).length === 0 && <div className="td-hint">No comments yet</div>}
              </ul>
              <form className="td-comment-form" onSubmit={submitComment}>
                <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" />
                <button className="btn btn-primary btn-sm" type="submit" disabled={!comment.trim()}>Send</button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>

    {reviewOpen && task && (
      <SubmitReviewModal
        task={task}
        onClose={() => setReviewOpen(false)}
        onSubmitted={(u) => { onChanged?.(u); load(); }}
      />
    )}
    </>
  );
}

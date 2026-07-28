import { useState } from "react";
import { updateTask } from "../../../api/pm";
import { STATUS_LABEL, STATUSES, PRIORITY_COLOR, fmtDay, fmtMins, isOverdue } from "../pmUtils";

// A table of tasks. Reused by Home, My Tasks, and inside projects.
// props: tasks, onEdit(task), onChanged(updatedTask), showProject, showAssignee
export default function TaskListView({ tasks, onEdit, onChanged, showProject = true, showAssignee = false }) {
  const [busyId, setBusyId] = useState(null);
  const [editTime, setEditTime] = useState(null); // task id whose time is being edited
  const [timeVal, setTimeVal] = useState(0);

  const cycleStatus = async (t) => {
    const next = STATUSES[(STATUSES.indexOf(t.status) + 1) % STATUSES.length];
    setBusyId(t._id);
    try {
      const u = await updateTask(t._id, { status: next });
      onChanged?.(u);
    } finally { setBusyId(null); }
  };

  const saveTime = async (t) => {
    const mins = Math.max(0, Number(timeVal) || 0);
    setEditTime(null);
    const u = await updateTask(t._id, { timeSpent: mins });
    onChanged?.(u);
  };

  if (!tasks.length) return <div className="pm-empty">No tasks here.</div>;

  return (
    <div className="table-wrap">
      <table className="data pm-task-table">
        <thead>
          <tr>
            <th>Task</th>
            {showProject && <th>Project</th>}
            {showAssignee && <th>Assignee</th>}
            <th>Priority</th>
            <th>Due</th>
            <th>Time</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t._id} className={t.status === "done" ? "row-done" : ""}>
              <td>
                <button className="link-title" onClick={() => onEdit?.(t)}>{t.title}</button>
              </td>
              {showProject && <td>{t.projectId?.name || "—"}</td>}
              {showAssignee && <td>{t.assignedTo?.name || "—"}</td>}
              <td>
                <span className="prio-dot" style={{ background: PRIORITY_COLOR[t.priority] }} />
                <span style={{ textTransform: "capitalize" }}>{t.priority}</span>
              </td>
              <td className={isOverdue(t) ? "due-over" : ""}>{fmtDay(t.dueDate)}</td>
              <td>
                {editTime === t._id ? (
                  <span className="time-edit">
                    <input type="number" min="0" step="5" value={timeVal} autoFocus
                      onChange={(e) => setTimeVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveTime(t)} />
                    <button className="btn btn-sm btn-primary" onClick={() => saveTime(t)}>✓</button>
                  </span>
                ) : (
                  <button className="time-link" title="Edit time logged"
                    onClick={() => { setEditTime(t._id); setTimeVal(t.timeSpent || 0); }}>
                    ⏱ {fmtMins(t.timeSpent)}
                  </button>
                )}
              </td>
              <td>
                <button className={`status-chip s-${t.status}`} disabled={busyId === t._id}
                  onClick={() => cycleStatus(t)} title="Click to advance status">
                  {STATUS_LABEL[t.status]}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

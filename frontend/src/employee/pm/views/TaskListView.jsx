import { STATUS_LABEL, PRIORITY_COLOR, fmtDay, fmtMs, isOverdue, isClosed } from "../pmUtils";

// A table of tasks. Reused by Home, My Tasks, and inside projects. Clicking a task
// opens its detail panel (onEdit); the status chip is display-only here.
// The Time column shows the AUTO-tracked worked time (start→done minus review) —
// read-only, nobody edits it.
// props: tasks, onEdit(task), onChanged(updatedTask), showProject, showAssignee
export default function TaskListView({ tasks, onEdit, onChanged, showProject = true, showAssignee = false }) {
  if (!tasks.length) return <div className="pm-empty">No tasks here.</div>;

  const timeCell = (t) => {
    if (t.activeMs) return `⏱ ${fmtMs(t.activeMs)}`;
    if (t.startedAt && !isClosed(t)) return "⏱ running…";
    return "—";
  };

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
              {showAssignee && (
                <td>{t.assignedTo?.name || "—"}{t.coAssignees?.length ? ` +${t.coAssignees.length}` : ""}</td>
              )}
              <td>
                <span className="prio-dot" style={{ background: PRIORITY_COLOR[t.priority] }} />
                <span style={{ textTransform: "capitalize" }}>{t.priority}</span>
              </td>
              <td className={isOverdue(t) ? "due-over" : ""}>{fmtDay(t.dueDate)}</td>
              <td className="time-auto">{timeCell(t)}</td>
              <td>
                <button className={`status-chip s-${t.status}`} onClick={() => onEdit?.(t)} title="Open task">
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

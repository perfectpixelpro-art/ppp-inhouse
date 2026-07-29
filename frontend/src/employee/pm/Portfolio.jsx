import { useEffect, useMemo, useState } from "react";
import { fetchPortfolio } from "../../api/pm";
import { useAuth } from "../../context/AuthContext";
import { fmtMins, fmtDateTime } from "./pmUtils";
import "./pm.css";

// Portfolio of completed tasks.
//  - Employees see only their own completed tasks.
//  - Admin/HR (isStaff) see everyone's, with an employee filter.
// Filter options are derived from the returned data so they always match what's
// actually there. Completion is shown as date + time and sorted by it.
export default function Portfolio() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "hr";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState("");
  const [project, setProject] = useState("");
  const [sortAsc, setSortAsc] = useState(false); // by completion date-time, newest first

  useEffect(() => {
    setLoading(true);
    fetchPortfolio().then(setRows).finally(() => setLoading(false));
  }, []);

  // Distinct employees / projects present in the data → filter dropdowns.
  const employees = useMemo(() => {
    const m = new Map();
    rows.forEach((t) => t.assignedTo && m.set(t.assignedTo._id, t.assignedTo.name));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);
  const projects = useMemo(() => {
    const m = new Map();
    rows.forEach((t) => t.projectId && m.set(t.projectId._id, t.projectId.name));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const view = useMemo(() => {
    let out = rows;
    if (isStaff && employee) out = out.filter((t) => t.assignedTo?._id === employee);
    if (project) out = out.filter((t) => t.projectId?._id === project);
    out = [...out].sort((a, b) => new Date(a.completedAt || 0) - new Date(b.completedAt || 0));
    return sortAsc ? out : out.reverse();
  }, [rows, isStaff, employee, project, sortAsc]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Portfolio</h2>
          <p>{isStaff ? "Completed tasks across all employees" : "Tasks you've completed"}</p>
        </div>
      </div>

      <div className="pf-filters">
        {isStaff && (
          <select value={employee} onChange={(e) => setEmployee(e.target.value)}>
            <option value="">All employees</option>
            {employees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
        <select value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">All projects</option>
          {projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <span className="pf-total">{view.length} task{view.length === 1 ? "" : "s"}</span>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : view.length === 0 ? (
        <div className="pm-empty">No completed tasks{isStaff ? "" : " yet"}.</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {isStaff && <th>Employee</th>}
                <th>Task</th>
                <th>Project</th>
                <th>Time taken</th>
                <th className="sortable" onClick={() => setSortAsc((s) => !s)}>
                  Completed (date &amp; time) {sortAsc ? "▲" : "▼"}
                </th>
              </tr>
            </thead>
            <tbody>
              {view.map((t) => (
                <tr key={t._id}>
                  {isStaff && <td>{t.assignedTo?.name || "—"}</td>}
                  <td>{t.title}</td>
                  <td>{t.projectId?.name || "—"}</td>
                  <td>⏱ {fmtMins(t.timeSpent)}</td>
                  <td>{fmtDateTime(t.completedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

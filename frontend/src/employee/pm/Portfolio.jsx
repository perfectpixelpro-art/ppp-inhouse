import { useEffect, useMemo, useState } from "react";
import { fetchPortfolio, fetchProjects, fetchAssignableUsers } from "../../api/pm";
import { fmtMins, fmtDayYear } from "./pmUtils";

export default function Portfolio() {
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState("");
  const [project, setProject] = useState("");
  const [sortAsc, setSortAsc] = useState(false); // by completion date, newest first

  useEffect(() => {
    fetchProjects().then(setProjects).catch(() => {});
    fetchAssignableUsers().then(setPeople).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (employee) params.employee = employee;
    if (project) params.project = project;
    fetchPortfolio(params).then(setRows).finally(() => setLoading(false));
  }, [employee, project]);

  const sorted = useMemo(() => {
    const s = [...rows].sort((a, b) => new Date(a.completedAt || 0) - new Date(b.completedAt || 0));
    return sortAsc ? s : s.reverse();
  }, [rows, sortAsc]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Portfolio</h2>
          <p>Completed tasks across projects</p>
        </div>
      </div>

      <div className="pf-filters">
        <select value={employee} onChange={(e) => setEmployee(e.target.value)}>
          <option value="">All employees</option>
          {people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">All projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="pm-empty">No completed tasks match these filters.</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Task</th>
                <th>Project</th>
                <th>Time taken</th>
                <th className="sortable" onClick={() => setSortAsc((s) => !s)}>
                  Completed {sortAsc ? "▲" : "▼"}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t._id}>
                  <td>{t.assignedTo?.name || "—"}</td>
                  <td>{t.title}</td>
                  <td>{t.projectId?.name || "—"}</td>
                  <td>⏱ {fmtMins(t.timeSpent)}</td>
                  <td>{fmtDayYear(t.completedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

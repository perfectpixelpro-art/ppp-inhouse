import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchProject, fetchProjectTasks, fetchProjectStats, deleteProject } from "../../api/pm";
import { useAuth } from "../../context/AuthContext";
import { canSeeAllPM } from "../../roles";
import Avatar from "../../panel/Avatar";
import TaskListView from "./views/TaskListView";
import GanttView from "./views/GanttView";
import CalendarView from "./views/CalendarView";
import ProjectDashboard from "./ProjectDashboard";
import TaskModal from "./TaskModal";
import { fmtDayYear } from "./pmUtils";

const TABS = ["overview", "timeline", "dashboard", "calendar"];
const TAB_LABEL = { overview: "Overview", timeline: "Timeline", dashboard: "Dashboard", calendar: "Calendar" };

export default function ProjectDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const canManage = canSeeAllPM(user?.role);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const loadTasks = useCallback(() => {
    fetchProjectTasks(id).then(setTasks).catch(() => {});
    fetchProjectStats(id).then(setStats).catch(() => {});
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchProject(id)
      .then(setProject)
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
    loadTasks();
  }, [id, loadTasks]);

  const upsert = (u) => {
    setTasks((ts) => (ts.some((x) => x._id === u._id) ? ts.map((x) => (x._id === u._id ? u : x)) : [u, ...ts]));
    fetchProjectStats(id).then(setStats).catch(() => {}); // status changes shift the numbers
  };

  const removeProject = async () => {
    if (!window.confirm("Delete this project and all its tasks?")) return;
    try { await deleteProject(id); nav(".."); } catch (e) { setError(e.response?.data?.message || e.message); }
  };

  if (loading) return <div className="loading">Loading…</div>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!project) return null;

  return (
    <div>
      <div className="page-head">
        <div>
          <button className="link-back" onClick={() => nav("..")}>← Projects</button>
          <h2>{project.name}</h2>
          <p>{project.description || "No description"}</p>
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={() => setModal({ defaults: { projectId: id } })}>+ Add Task</button>
          </div>
        )}
      </div>

      <div className="task-tabs pm-proj-tabs">
        {TABS.map((t) => (
          <button key={t} className={`task-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{TAB_LABEL[t]}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="proj-overview">
          <div className="ov-block">
            <div className="ov-label">Description</div>
            <div>{project.description || "—"}</div>
          </div>
          <div className="ov-grid">
            <div className="ov-block"><div className="ov-label">Created by</div><div>{project.createdBy?.name || "—"}</div></div>
            <div className="ov-block"><div className="ov-label">Created on</div><div>{fmtDayYear(project.createdAt)}</div></div>
            <div className="ov-block"><div className="ov-label">Tasks</div><div>{stats ? `${stats.done}/${stats.total} done` : "—"}</div></div>
            <div className="ov-block"><div className="ov-label">Overdue</div><div>{stats?.overdue ?? "—"}</div></div>
          </div>
          <div className="ov-block">
            <div className="ov-label">Members ({project.members?.length || 0})</div>
            <div className="ov-members">
              {project.members?.map((m) => (
                <div key={m._id} className="ov-member">
                  <Avatar user={m} size={28} />
                  <span>{m.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ov-block">
            <div className="ov-label">All tasks</div>
            <TaskListView tasks={tasks} onEdit={(t) => setModal({ task: t })} onChanged={upsert} showProject={false} showAssignee />
          </div>
          {canManage && <button className="btn btn-ghost btn-sm ov-danger" onClick={removeProject}>Delete project</button>}
        </div>
      )}

      {tab === "timeline" && <GanttView tasks={tasks} onEdit={(t) => setModal({ task: t })} />}
      {tab === "dashboard" && <ProjectDashboard stats={stats} />}
      {tab === "calendar" && <CalendarView tasks={tasks} onEdit={(t) => setModal({ task: t })} />}

      {modal && (
        <TaskModal
          task={modal.task}
          defaults={modal.defaults}
          projects={project ? [project] : []}
          onClose={() => setModal(null)}
          onSaved={upsert}
        />
      )}
    </div>
  );
}

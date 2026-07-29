import { useEffect, useState } from "react";
import { fetchMyTasks, fetchAllTasks, fetchProjects } from "../../api/pm";
import { useAuth } from "../../context/AuthContext";
import TaskViews from "./views/TaskViews";
import TaskModal from "./TaskModal";

// Home — List / Timeline / Calendar views of tasks. The List view is split into
// Today / Upcoming / Overdue tabs. Admin/HR see every employee's tasks (with an
// assignee column); employees see only their own.
export default function PMHome() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "hr";
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {task} | {defaults} | null

  useEffect(() => {
    (isStaff ? fetchAllTasks() : fetchMyTasks()).then(setTasks).finally(() => setLoading(false));
    fetchProjects().then(setProjects).catch(() => {});
  }, [isStaff]);

  const upsert = (u) => setTasks((ts) => (ts.some((x) => x._id === u._id) ? ts.map((x) => (x._id === u._id ? u : x)) : [u, ...ts]));

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Home</h2>
          <p>{isStaff ? "All tasks — by list, timeline or calendar" : "Your tasks — by list, timeline or calendar"}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ defaults: {} })}>+ New Task</button>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <TaskViews
          tasks={tasks}
          onEdit={(t) => setModal({ task: t })}
          onChanged={upsert}
          listTabs={["today", "upcoming", "overdue"]}
          showProject
          showAssignee={isStaff}
        />
      )}

      {modal && (
        <TaskModal
          task={modal.task}
          defaults={modal.defaults}
          projects={projects}
          onClose={() => setModal(null)}
          onSaved={upsert}
        />
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { fetchMyTasks, fetchAllTasks, fetchProjects } from "../../api/pm";
import { useAuth } from "../../context/AuthContext";
import { canSeeAllPM } from "../../roles";
import TaskTabsList from "./views/TaskTabsList";
import TaskModal from "./TaskModal";

// My Tasks — a plain task list split into Today / Overdue / Upcoming / Completed
// tabs. No timeline or calendar here. Admin/HR/Project-Manager see every employee's
// tasks (with an assignee column); employees see only their own.
export default function PMMyTasks() {
  const { user } = useAuth();
  const isStaff = canSeeAllPM(user?.role);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    (isStaff ? fetchAllTasks() : fetchMyTasks()).then(setTasks).finally(() => setLoading(false));
    fetchProjects().then(setProjects).catch(() => {});
  }, [isStaff]);

  const upsert = (u) => setTasks((ts) => (ts.some((x) => x._id === u._id) ? ts.map((x) => (x._id === u._id ? u : x)) : [u, ...ts]));

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>{isStaff ? "All Tasks" : "My Tasks"}</h2>
          <p>{isStaff ? "Every employee's tasks" : "Everything assigned to you"}</p>
        </div>
        {isStaff && <button className="btn btn-primary" onClick={() => setModal({ defaults: {} })}>+ New Task</button>}
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <TaskTabsList
          tabs={["today", "overdue", "upcoming", "completed"]}
          tasks={tasks}
          onEdit={(t) => setModal({ task: t })}
          onChanged={upsert}
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

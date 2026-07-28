import { useEffect, useState } from "react";
import { fetchMyTasks, fetchProjects } from "../../api/pm";
import TaskTabsList from "./views/TaskTabsList";
import TaskModal from "./TaskModal";

// My Tasks — a plain task list split into Today / Overdue / Upcoming / Completed
// tabs. No timeline or calendar here (those live on Home).
export default function PMMyTasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    fetchMyTasks().then(setTasks).finally(() => setLoading(false));
    fetchProjects().then(setProjects).catch(() => {});
  }, []);

  const upsert = (u) => setTasks((ts) => (ts.some((x) => x._id === u._id) ? ts.map((x) => (x._id === u._id ? u : x)) : [u, ...ts]));

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>My Tasks</h2>
          <p>Everything assigned to you</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ defaults: {} })}>+ New Task</button>
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

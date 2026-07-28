import { useEffect, useState } from "react";
import { fetchMyTasks, fetchProjects } from "../../api/pm";
import TaskViews from "./views/TaskViews";
import TaskModal from "./TaskModal";

// Home — List / Timeline / Calendar views of my tasks. The List view is split
// into Today / Upcoming / Overdue tabs.
export default function PMHome() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {task} | {defaults} | null

  useEffect(() => {
    fetchMyTasks().then(setTasks).finally(() => setLoading(false));
    fetchProjects().then(setProjects).catch(() => {});
  }, []);

  const upsert = (u) => setTasks((ts) => (ts.some((x) => x._id === u._id) ? ts.map((x) => (x._id === u._id ? u : x)) : [u, ...ts]));

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Home</h2>
          <p>Your tasks — by list, timeline or calendar</p>
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

import { useMemo, useState } from "react";
import TaskListView from "./TaskListView";
import { bucketTasks, BUCKET_LABEL } from "../pmUtils";

// A task list split into buckets shown as tabs (Today / Overdue / Upcoming / Completed).
// `tabs` chooses which buckets appear and in what order.
// props: tasks, tabs (array of bucket keys), onEdit, onChanged, showProject, showAssignee
export default function TaskTabsList({
  tabs = ["today", "overdue", "upcoming", "completed"],
  tasks,
  onEdit,
  onChanged,
  showProject = true,
  showAssignee = false,
}) {
  const buckets = useMemo(() => bucketTasks(tasks), [tasks]);
  const [active, setActive] = useState(tabs[0]);
  const current = tabs.includes(active) ? active : tabs[0];

  return (
    <div>
      <div className="task-tabs pm-bucket-tabs">
        {tabs.map((k) => (
          <button
            key={k}
            className={`task-tab ${current === k ? "active" : ""} ${k === "overdue" && buckets.overdue.length ? "danger" : ""}`}
            onClick={() => setActive(k)}
          >
            {BUCKET_LABEL[k]}
            <span className="task-count">{buckets[k].length}</span>
          </button>
        ))}
      </div>
      <TaskListView
        tasks={buckets[current]}
        onEdit={onEdit}
        onChanged={onChanged}
        showProject={showProject}
        showAssignee={showAssignee}
      />
    </div>
  );
}

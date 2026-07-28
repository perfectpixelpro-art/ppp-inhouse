import { useState } from "react";
import TaskTabsList from "./TaskTabsList";
import GanttView from "./GanttView";
import CalendarView from "./CalendarView";

// List / Timeline / Calendar switcher used on the Home screen. The List view is
// itself split into Today / Upcoming / Overdue tabs.
// props: tasks, onEdit, onChanged, showProject, showAssignee, listTabs
export default function TaskViews({
  tasks,
  onEdit,
  onChanged,
  showProject = true,
  showAssignee = false,
  listTabs = ["today", "upcoming", "overdue"],
}) {
  const [view, setView] = useState("list");
  return (
    <div>
      <div className="view-toggle pm-view-toggle">
        <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>List</button>
        <button className={view === "timeline" ? "active" : ""} onClick={() => setView("timeline")}>Timeline</button>
        <button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>Calendar</button>
      </div>
      {view === "list" && (
        <TaskTabsList tabs={listTabs} tasks={tasks} onEdit={onEdit} onChanged={onChanged} showProject={showProject} showAssignee={showAssignee} />
      )}
      {view === "timeline" && <GanttView tasks={tasks} onEdit={onEdit} />}
      {view === "calendar" && <CalendarView tasks={tasks} onEdit={onEdit} />}
    </div>
  );
}

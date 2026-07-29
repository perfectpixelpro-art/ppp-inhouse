// Shared helpers for the Project Management module.

export const STATUS_LABEL = { todo: "To-do", in_progress: "In progress", done: "Done" };
export const STATUSES = ["todo", "in_progress", "done"];
export const PRIORITIES = ["low", "medium", "high"];

export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const todayStart = () => startOfDay(new Date());

export const isSameDay = (a, b) => a && b && startOfDay(a).getTime() === startOfDay(b).getTime();
export const isOverdue = (t) => t.status !== "done" && t.dueDate && startOfDay(t.dueDate) < todayStart();
export const isToday = (t) => t.dueDate && isSameDay(t.dueDate, new Date());
export const isUpcoming = (t) => t.status !== "done" && t.dueDate && startOfDay(t.dueDate) > todayStart();

// Split a user's tasks into Today / Overdue / Upcoming / Completed.
// Upcoming absorbs anything open that isn't due today or overdue (incl. no due date),
// so no task is ever hidden from the list.
export const bucketTasks = (tasks) => ({
  today: tasks.filter((t) => t.status !== "done" && isToday(t)),
  overdue: tasks.filter(isOverdue),
  upcoming: tasks.filter((t) => t.status !== "done" && !isToday(t) && !isOverdue(t)),
  completed: tasks.filter((t) => t.status === "done"),
});

export const BUCKET_LABEL = { today: "Today", overdue: "Overdue", upcoming: "Upcoming", completed: "Completed" };

// minutes → "1h 30m" / "45m" / "—"
export const fmtMins = (mins) => {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  if (!m) return "0m";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? (mm ? `${h}h ${mm}m` : `${h}h`) : `${mm}m`;
};

export const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";

export const fmtDayYear = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// "28 Jul 2026, 04:35 PM" — completion shown date + time.
export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      })
    : "—";

export const ymd = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export const dayDiff = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);

export const PRIORITY_COLOR = { low: "#6b7280", medium: "#b45309", high: "#dc2626" };
export const STATUS_COLOR = { todo: "#6b7280", in_progress: "#b45309", done: "#16a34a" };

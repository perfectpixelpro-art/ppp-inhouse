// Shared helpers for the Project Management module.

export const STATUS_LABEL = {
  todo: "To-do", in_progress: "In progress", in_review: "In review", approved: "Approved", done: "Done",
};
export const STATUSES = ["todo", "in_progress", "in_review", "approved", "done"];
// "Closed" = work is finished / signed off; excluded from active buckets.
export const CLOSED_STATUSES = ["approved", "done"];
export const isClosed = (t) => CLOSED_STATUSES.includes(t.status);
export const PRIORITIES = ["low", "medium", "high"];

export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const todayStart = () => startOfDay(new Date());

export const isSameDay = (a, b) => a && b && startOfDay(a).getTime() === startOfDay(b).getTime();
// Overdue once the due date-and-time has passed. A date-only due (midnight) is
// treated as end of that day; a due with a specific time uses that exact instant.
export const isOverdue = (t) => {
  if (isClosed(t) || !t.dueDate) return false;
  const due = new Date(t.dueDate);
  const midnight = due.getHours() === 0 && due.getMinutes() === 0 && due.getSeconds() === 0;
  const eff = midnight ? new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59, 999) : due;
  return eff.getTime() < Date.now();
};
export const isToday = (t) => t.dueDate && isSameDay(t.dueDate, new Date());
export const isUpcoming = (t) => !isClosed(t) && t.dueDate && startOfDay(t.dueDate) > todayStart();

// Split a user's tasks into Today / Overdue / Upcoming / Completed.
// Upcoming absorbs anything open that isn't due today or overdue (incl. no due date),
// so no task is ever hidden from the list. Completed = closed (approved or done).
export const bucketTasks = (tasks) => ({
  today: tasks.filter((t) => !isClosed(t) && isToday(t) && !isOverdue(t)),
  overdue: tasks.filter(isOverdue),
  upcoming: tasks.filter((t) => !isClosed(t) && !isToday(t) && !isOverdue(t)),
  completed: tasks.filter(isClosed),
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

// milliseconds → "1h 30m" / "45m" / "—"
export const fmtMs = (ms) => {
  const m = Math.round((Number(ms) || 0) / 60000);
  return m ? fmtMins(m) : "—";
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

// Turn a file URL into one that forces a download. Cloudinary needs the
// fl_attachment transform; same-origin uploads use the anchor download attr.
export const downloadUrl = (url) => {
  if (typeof url === "string" && url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", "/upload/fl_attachment/");
  }
  return url;
};

// Local "YYYY-MM-DDTHH:mm" for <input type="datetime-local"> (date + time).
export const ymdhm = (d) => {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
};

export const dayDiff = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);

export const PRIORITY_COLOR = { low: "#6b7280", medium: "#b45309", high: "#dc2626" };
export const STATUS_COLOR = {
  todo: "#6b7280", in_progress: "#b45309", in_review: "#2563eb", approved: "#0d9488", done: "#16a34a",
};

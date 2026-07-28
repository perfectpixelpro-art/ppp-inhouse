import { useState } from "react";
import { isSameDay, ymd, STATUS_COLOR } from "../pmUtils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Month calendar with tasks plotted on their due date. props: tasks, onEdit(task)
export default function CalendarView({ tasks, onEdit }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7) cells.push(null);

  const tasksOn = (date) => tasks.filter((t) => t.dueDate && isSameDay(t.dueDate, date));
  const move = (delta) => setCursor(new Date(year, month + delta, 1));

  return (
    <div className="pm-cal">
      <div className="pm-cal-head">
        <button className="btn btn-ghost btn-sm" onClick={() => move(-1)}>‹</button>
        <strong>{cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong>
        <button className="btn btn-ghost btn-sm" onClick={() => move(1)}>›</button>
      </div>
      <div className="pm-cal-grid">
        {WEEKDAYS.map((w) => <div key={w} className="pm-cal-dow">{w}</div>)}
        {cells.map((date, i) => (
          <div key={i} className={`pm-cal-cell ${date && isSameDay(date, new Date()) ? "is-today" : ""} ${!date ? "empty" : ""}`}>
            {date && (
              <>
                <div className="pm-cal-date">{date.getDate()}</div>
                <div className="pm-cal-tasks">
                  {tasksOn(date).map((t) => (
                    <button key={t._id} className="pm-cal-task" style={{ borderLeftColor: STATUS_COLOR[t.status] }}
                      title={t.title} onClick={() => onEdit?.(t)}>
                      {t.title}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

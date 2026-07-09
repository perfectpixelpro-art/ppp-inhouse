import { useState } from "react";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// events: [{ date: Date|string, label: string, kind?: 'holiday'|'leave'|'bday' }]
export default function Calendar({ events = [] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toDateString();

  const byDay = {};
  for (const e of events) {
    const d = new Date(e.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      (byDay[d.getDate()] ||= []).push(e);
    }
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const label = cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const shift = (n) => setCursor(new Date(year, month + n, 1));

  return (
    <div className="cal">
      <div className="cal-head">
        <button onClick={() => shift(-1)}>‹ Prev</button>
        <strong>{label}</strong>
        <button onClick={() => shift(1)}>Next ›</button>
      </div>
      <div className="cal-grid">
        {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="cal-cell muted" />;
          const isToday = new Date(year, month, d).toDateString() === todayStr;
          return (
            <div key={d} className={`cal-cell ${isToday ? "today" : ""}`}>
              <div className="cal-date">{d}</div>
              {(byDay[d] || []).map((e, idx) => (
                <span key={idx} className={`cal-event ${e.kind || "holiday"}`} title={e.label}>
                  {e.label}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

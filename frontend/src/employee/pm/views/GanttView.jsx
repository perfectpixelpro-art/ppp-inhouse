import { useMemo } from "react";
import { startOfDay, dayDiff, fmtDay, STATUS_COLOR, STATUS_LABEL } from "../pmUtils";

const DAY_PX = 30;

// Lightweight Asana-style timeline: one bar per task from startDate→dueDate on a
// shared day scale. No external library. Tasks without dates are listed as unscheduled.
// props: tasks, onEdit(task)
export default function GanttView({ tasks, onEdit }) {
  const scheduled = tasks.filter((t) => t.startDate || t.dueDate);
  const unscheduled = tasks.filter((t) => !t.startDate && !t.dueDate);

  const { min, days, months } = useMemo(() => {
    if (!scheduled.length) return { min: null, days: 0, months: [] };
    let lo = Infinity, hi = -Infinity;
    for (const t of scheduled) {
      const s = startOfDay(t.startDate || t.dueDate).getTime();
      const e = startOfDay(t.dueDate || t.startDate).getTime();
      lo = Math.min(lo, s, e);
      hi = Math.max(hi, s, e);
    }
    const minD = new Date(lo);
    const pad = 1;
    const start = new Date(minD); start.setDate(start.getDate() - pad);
    const total = dayDiff(start, new Date(hi)) + pad + 2;
    // month bands
    const bands = [];
    let i = 0;
    while (i < total) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      const monthLen = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const remainingInMonth = monthLen - d.getDate() + 1;
      const span = Math.min(remainingInMonth, total - i);
      bands.push({ label, span });
      i += span;
    }
    return { min: start, days: total, months: bands };
  }, [scheduled]);

  if (!scheduled.length && !unscheduled.length) return <div className="pm-empty">No tasks to show on the timeline.</div>;

  const todayOffset = min ? dayDiff(min, new Date()) : -1;

  return (
    <div className="gantt">
      {scheduled.length > 0 && (
        <div className="gantt-scroll">
          <div className="gantt-inner" style={{ width: 200 + days * DAY_PX }}>
            {/* header */}
            <div className="gantt-head">
              <div className="gantt-label-col">Task</div>
              <div className="gantt-timeline" style={{ width: days * DAY_PX }}>
                {months.map((m, idx) => (
                  <div key={idx} className="gantt-month" style={{ width: m.span * DAY_PX }}>{m.label}</div>
                ))}
                {todayOffset >= 0 && todayOffset < days && (
                  <div className="gantt-today" style={{ left: todayOffset * DAY_PX }} title="Today" />
                )}
              </div>
            </div>
            {/* rows */}
            {scheduled.map((t) => {
              const s = startOfDay(t.startDate || t.dueDate);
              const e = startOfDay(t.dueDate || t.startDate);
              const left = dayDiff(min, s) * DAY_PX;
              const width = Math.max(1, dayDiff(s, e) + 1) * DAY_PX;
              return (
                <div key={t._id} className="gantt-row">
                  <div className="gantt-label-col" title={t.title}>{t.title}</div>
                  <div className="gantt-timeline" style={{ width: days * DAY_PX }}>
                    {todayOffset >= 0 && todayOffset < days && (
                      <div className="gantt-today" style={{ left: todayOffset * DAY_PX }} />
                    )}
                    <button
                      className="gantt-bar"
                      style={{ left, width, background: STATUS_COLOR[t.status] }}
                      title={`${t.title} · ${STATUS_LABEL[t.status]} · ${fmtDay(t.startDate)} → ${fmtDay(t.dueDate)}`}
                      onClick={() => onEdit?.(t)}
                    >
                      <span className="gantt-bar-label">{t.title}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {unscheduled.length > 0 && (
        <div className="gantt-unscheduled">
          <div className="gantt-unscheduled-head">No dates set</div>
          {unscheduled.map((t) => (
            <button key={t._id} className="gantt-chip" onClick={() => onEdit?.(t)}>{t.title}</button>
          ))}
        </div>
      )}
    </div>
  );
}

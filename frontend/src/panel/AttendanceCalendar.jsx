import { useEffect, useState } from "react";
import { fmtDate, fmtTime } from "./utils";
import Modal from "./Modal";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR = 3600000;
const targetMs = (r) => (r.dayType === "half" ? 4 : 8) * HOUR;
const fmtHm = (ms) => {
  const m = Math.round(ms / 60000);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? (mm ? `${h}h ${mm}m` : `${h}h`) : `${mm}m`;
};
// >= target green · within 30m below yellow · else red
const colorClass = (ms, t) => (ms >= t ? "att-g" : ms >= t - 0.5 * HOUR ? "att-y" : "att-r");
const STATUS_LABEL = { ended: "Ended", working: "Working", on_lunch: "On lunch", on_break: "On short break", not_started: "Not started" };

const pad = (n) => String(n).padStart(2, "0");
const monthToDate = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1);
};

// records: [{ date:'YYYY-MM-DD', workedMs, dayType, state, employee, checkIn, checkOut, dsr }]
// month: 'YYYY-MM' (controlled by parent) — if omitted, the calendar has its own nav.
export default function AttendanceCalendar({ records = [], month, showName = false }) {
  const controlled = !!month;
  const [cursor, setCursor] = useState(() => (month ? monthToDate(month) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [detail, setDetail] = useState(null); // { date, recs }
  useEffect(() => { if (month) setCursor(monthToDate(month)); }, [month]);

  const year = cursor.getFullYear();
  const mon = cursor.getMonth();
  const firstDay = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const todayStr = new Date().toDateString();

  const byDate = {};
  for (const r of records) (byDate[r.date] ||= []).push(r);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const label = cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const shift = (n) => setCursor(new Date(year, mon + n, 1));

  return (
    <div>
      <div className="cal-legend">
        <span><i className="att-g" /> On target</span>
        <span><i className="att-y" /> Slightly short (≤30m)</span>
        <span><i className="att-r" /> Short</span>
        <span><i className="att-rain" /> Rain day</span>
      </div>
      <div className="cal">
        <div className="cal-head">
          {controlled ? <span /> : <button onClick={() => shift(-1)}>‹ Prev</button>}
          <strong>{label}</strong>
          {controlled ? <span /> : <button onClick={() => shift(1)}>Next ›</button>}
        </div>
        <div className="cal-grid">
          {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} className="cal-cell muted" />;
            const dateStr = `${year}-${pad(mon + 1)}-${pad(d)}`;
            const isToday = new Date(year, mon, d).toDateString() === todayStr;
            const recs = byDate[dateStr] || [];
            const clickable = recs.length > 0;
            return (
              <div
                key={d}
                className={`cal-cell ${isToday ? "today" : ""} ${clickable ? "cal-clickable" : ""}`}
                onClick={clickable ? () => setDetail({ date: dateStr, recs }) : undefined}
              >
                <div className="cal-date">{d}</div>
                {recs.map((r) => {
                  const ms = r.workedMs || 0;
                  const ended = r.state === "ended";
                  const name = showName ? `${(r.employee?.name || "").split(" ")[0]} · ` : "";
                  if (r.rain) {
                    return (
                      <span key={r._id} className="att-pill att-rain" title={`${r.employee?.name || ""} — rain day`}>
                        {name}🌧 Rain
                      </span>
                    );
                  }
                  const c = ended ? colorClass(ms, targetMs(r)) : "att-n";
                  return (
                    <span key={r._id} className={`att-pill ${c}`} title={`${r.employee?.name || ""} ${ended ? fmtHm(ms) : r.state}`}>
                      {name}{ended ? fmtHm(ms) : "—"}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {detail && (
        <Modal title={fmtDate(detail.date)} onClose={() => setDetail(null)}>
          <div className="day-detail">
            {detail.recs.map((r) => {
              const ms = r.workedMs || 0;
              const ended = r.state === "ended";
              const ot = ms - targetMs(r);
              return (
                <div key={r._id} className="day-detail-card">
                  <div className="ddc-head">
                    <strong>{r.employee?.name || "You"}</strong>
                    <span className={`day-tag sm ${r.dayType === "half" ? "half" : "full"}`}>{r.dayType === "half" ? "Half" : "Full"}</span>
                    <span className={`badge ${ended ? "badge-approved" : "badge-pending"}`}>{STATUS_LABEL[r.state] || r.state}</span>
                    {r.rain && <span className="badge att-rain" style={{ color: "#fff" }}>🌧 Rain day</span>}
                  </div>
                  <div className="ddc-grid">
                    <div><span className="rg-label">In</span><span style={{ color: "#15803d", fontWeight: 600 }}>{fmtTime(r.checkIn) || "—"}</span></div>
                    <div><span className="rg-label">Out</span><span style={{ color: "var(--red-dark)", fontWeight: 600 }}>{fmtTime(r.checkOut) || "—"}</span></div>
                    <div>
                      <span className="rg-label">Worked</span>
                      {ended ? <span className={`att-pill ${colorClass(ms, targetMs(r))}`} style={{ display: "inline-block" }}>{fmtHm(ms)}</span> : <span>—</span>}
                    </div>
                    <div>
                      <span className="rg-label">Overtime / Short</span>
                      {ended && ot > 60000 ? <span style={{ color: "#15803d", fontWeight: 700 }}>+{fmtHm(ot)}</span>
                        : ended && ot < -60000 ? <span style={{ color: "#b91c1c", fontWeight: 700 }}>−{fmtHm(-ot)}</span>
                        : <span>—</span>}
                    </div>
                  </div>
                  {r.breaks?.length > 0 && (
                    <div className="ddc-breaks">Breaks: {r.breaks.map((b) => b.type).join(", ")}</div>
                  )}
                  <div className="ddc-dsr">
                    <span className="rg-label">Daily Task (DSR)</span>
                    <p>{r.dsr || "—"}</p>
                  </div>
                  {r.autoClosed && <div className="ddc-note">⚠ {r.note}</div>}
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

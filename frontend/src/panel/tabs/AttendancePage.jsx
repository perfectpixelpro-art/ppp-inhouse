import { useEffect, useMemo, useState } from "react";
import { fetchAttendance, fetchEmployees, fetchHolidays } from "../../api/panel";
import { fmtDate, fmtTime, thisMonth, monthLabel, inr } from "../utils";
import Avatar from "../Avatar";
import Modal from "../Modal";
import AttendanceCalendar from "../AttendanceCalendar";
import BalanceCard from "../BalanceCard";
import LocationStamp from "../LocationStamp";
import { monthlySummary, SHORT_RATE, overtimeMs } from "../payroll";

const HOUR = 3600000;
const targetMs = (r) => (r.dayType === "half" ? 4 : 8) * HOUR;
const workedClass = (ms, t) => (ms >= t ? "work-green" : ms >= t - 0.5 * HOUR ? "work-yellow" : "work-red");
const hrs = (ms) => +(ms / HOUR).toFixed(2);
const fmtHm = (ms) => {
  const m = Math.round(ms / 60000);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? (mm ? `${h}h ${mm}m` : `${h}h`) : `${mm}m`;
};

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [month, setMonth] = useState(thisMonth());
  const [emp, setEmp] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("table");
  const [holidaySet, setHolidaySet] = useState(new Set());
  const [summary, setSummary] = useState(null);

  useEffect(() => { fetchEmployees().then(setEmployees); }, []);
  useEffect(() => {
    fetchHolidays().then((hs) =>
      setHolidaySet(new Set(hs.filter((h) => h.type === "national").map((h) => new Date(h.date).toISOString().slice(0, 10))))
    );
  }, []);

  // Click an employee name → monthly working-hours + shortfall deduction
  const openSummary = (emp) => {
    const [y, m] = month.split("-").map(Number);
    const recs = records.filter((r) => (r.employee?._id || r.employee) === emp._id);
    setSummary({ emp, ...monthlySummary(y, m - 1, recs, holidaySet) });
  };

  useEffect(() => {
    setLoading(true);
    const params = { month };
    if (emp) params.employee = emp;
    fetchAttendance(params).then(setRecords).finally(() => setLoading(false));
  }, [month, emp]);

  // Sort by employee name, then date — the "by employee" grouping
  const rows = useMemo(
    () =>
      records.slice().sort((a, b) => {
        const n = (a.employee?.name || "").localeCompare(b.employee?.name || "");
        return n !== 0 ? n : a.date.localeCompare(b.date);
      }),
    [records]
  );

  const totalWorked = records.reduce((s, r) => s + (r.workedMs || 0), 0);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>In / Out</h2>
          <p>Monthly check-in / check-out for every employee</p>
        </div>
        <div className="view-toggle">
          <button className={view === "table" ? "active" : ""} onClick={() => setView("table")}>Table</button>
          <button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>Calendar</button>
        </div>
      </div>

      <div className="toolbar">
        <label>Month:</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <label>Employee:</label>
        <select value={emp} onChange={(e) => setEmp(e.target.value)}>
          <option value="">All employees</option>
          {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
        </select>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">Records — {monthLabel(month)}</div>
          <div className="stat-value">{records.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total worked</div>
          <div className="stat-value">{fmtHm(totalWorked)}</div>
        </div>
      </div>

      <BalanceCard
        records={records}
        label={emp ? "Balance — selected employee" : "Balance — all employees"}
      />

      {loading ? (
        <div className="loading">Loading…</div>
      ) : view === "calendar" ? (
        <AttendanceCalendar records={records} month={month} showName />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Employee</th><th>Date</th><th>Day</th><th>In</th><th>Out</th>
                <th>Worked</th><th>Overtime</th><th>Short</th><th>Status</th><th>Location</th><th>Daily Task</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ms = r.workedMs || 0;
                const ot = overtimeMs(r); // excludes an un-taken lunch hour
                return (
                  <tr key={r._id}>
                    <td>
                      <div className="person cal-clickable" style={{ padding: 2, borderRadius: 6 }}
                        title="Monthly summary" onClick={() => r.employee && openSummary(r.employee)}>
                        <Avatar user={r.employee} size={30} />
                        <span className="p-name" style={{ textDecoration: "underline dotted" }}>{r.employee?.name || "—"}</span>
                      </div>
                    </td>
                    <td>{fmtDate(r.date)}</td>
                    <td><span className={`badge ${r.dayType === "half" ? "badge-neutral" : "badge-black"}`}>{r.dayType === "half" ? "Half" : "Full"}</span></td>
                    <td style={{ color: "#15803d", fontWeight: 600 }}>{fmtTime(r.checkIn)}</td>
                    <td style={{ color: "var(--red-dark)", fontWeight: 600 }}>{fmtTime(r.checkOut)}</td>
                    <td>{r.state === "ended" ? <span className={`badge ${workedClass(ms, targetMs(r))}`}>{fmtHm(ms)}</span> : "—"}</td>
                    <td>{r.state === "ended" && ot > 60000 ? <span style={{ color: "#15803d", fontWeight: 700 }}>+{fmtHm(ot)}</span> : "—"}</td>
                    <td>{r.state === "ended" && ot < -60000 ? <span style={{ color: "#b91c1c", fontWeight: 700 }}>−{fmtHm(-ot)}</span> : "—"}</td>
                    <td>
                      <span className={`badge ${r.state === "ended" ? "badge-approved" : "badge-pending"}`}>{r.state}</span>
                      {r.rain && <span className="badge att-rain" style={{ marginLeft: 4 }}>🌧 Rain</span>}
                    </td>
                    <td><LocationStamp loc={r.checkInLocation} showDevice /></td>
                    <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.dsr || ""}>
                      {r.dsr || "—"}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={11} className="empty">No attendance for this month.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {summary && (
        <Modal title={`${summary.emp.name} — ${monthLabel(month)}`} onClose={() => setSummary(null)}>
          <div className="review-grid">
            <div><span className="rg-label">Working days</span><span>{summary.workingDays} × 8h</span></div>
            <div><span className="rg-label">Base hours</span><span>{fmtHm(summary.baseMs)}</span></div>
            <div><span className="rg-label">Total worked</span><span style={{ fontWeight: 700 }}>{fmtHm(summary.workedMs)}</span></div>
            <div>
              <span className="rg-label">Overtime / Short</span>
              {summary.diffMs >= 0
                ? <span style={{ color: "#15803d", fontWeight: 700 }}>+{fmtHm(summary.diffMs)}</span>
                : <span style={{ color: "#b91c1c", fontWeight: 700 }}>−{fmtHm(-summary.diffMs)}</span>}
            </div>
            <div className="full">
              <span className="rg-label">Deduction ({inr(SHORT_RATE)}/short hour)</span>
              {summary.deduction > 0
                ? <span style={{ color: "#b91c1c", fontWeight: 700 }}>−{inr(summary.deduction)} <small>({summary.shortHours.toFixed(1)}h short)</small></span>
                : <span style={{ color: "#15803d", fontWeight: 700 }}>No deduction</span>}
            </div>
          </div>
          <p className="p-sub" style={{ marginTop: "0.75rem" }}>
            Off days excluded: Sundays, even Saturdays (2nd &amp; 4th), and national holidays.
            {summary.rainDays > 0 && ` ${summary.rainDays} rain day${summary.rainDays === 1 ? "" : "s"} counted normally.`}
          </p>
        </Modal>
      )}
    </div>
  );
}

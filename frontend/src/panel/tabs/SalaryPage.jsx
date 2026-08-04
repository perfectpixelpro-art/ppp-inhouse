import { useEffect, useState } from "react";
import { fetchEmployees, fetchLeaves, fetchAttendance, fetchHolidays } from "../../api/panel";
import { inr, monthLabel, thisMonth } from "../utils";
import { monthlySummary, SHORT_RATE } from "../payroll";
import Avatar from "../Avatar";

export default function SalaryPage() {
  const [list, setList] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(thisMonth());

  // Employees + approved leaves load once.
  useEffect(() => {
    Promise.all([fetchEmployees(), fetchLeaves({ status: "approved" })])
      .then(([emps, lv]) => { setList(emps); setLeaves(lv); })
      .finally(() => setLoading(false));
  }, []);

  // Attendance + holidays reload whenever the month changes (for short-hour deduction).
  useEffect(() => {
    Promise.all([fetchAttendance({ month }), fetchHolidays({ month })])
      .then(([att, hol]) => { setAttendance(att || []); setHolidays(hol || []); })
      .catch(() => {});
  }, [month]);

  // approved leaves in the selected month → deduction days per employee
  const ded = {}; // empId -> { salary, leave }
  for (const l of leaves) {
    if (String(l.fromDate).slice(0, 7) !== month) continue;
    const id = l.employee?._id || l.employee;
    (ded[id] ||= { salary: 0, leave: 0 })[l.deductType || "leave"] += l.deductionDays || 0;
  }

  // National holidays in this month → set of YYYY-MM-DD for the working-day base.
  const ymdOf = (d) => { const t = new Date(d).getTime(); return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10); };
  const holidaySet = new Set(
    holidays.filter((h) => h.type === "national" && ymdOf(h.date).slice(0, 7) === month).map((h) => ymdOf(h.date)).filter(Boolean)
  );
  const [yy, mm] = month.split("-").map(Number);

  // Short-hours deduction per employee (₹200 per short hour, from payroll.js).
  const shortByEmp = {}; // empId -> { deduction, shortHours }
  for (const e of list) {
    const recs = attendance.filter((a) => String(a.employee?._id || a.employee) === String(e._id));
    const s = monthlySummary(yy, (mm || 1) - 1, recs, holidaySet);
    shortByEmp[e._id] = { deduction: s.deduction, shortHours: s.shortHours };
  }

  const row = (e) => {
    const perDay = (e.monthlySalary || 0) / 30;
    const d = ded[e._id] || { salary: 0, leave: 0 };
    const leaveCut = d.salary * perDay;
    const short = shortByEmp[e._id] || { deduction: 0, shortHours: 0 };
    const totalCut = leaveCut + short.deduction;
    return {
      perDay, salaryDays: d.salary, leaveDays: d.leave, leaveCut,
      shortCut: short.deduction, shortHours: short.shortHours,
      totalCut, net: (e.monthlySalary || 0) - totalCut,
    };
  };

  const gross = list.reduce((s, e) => s + (e.monthlySalary || 0), 0);
  const netTotal = list.reduce((s, e) => s + row(e).net, 0);
  const dedTotal = list.reduce((s, e) => s + row(e).totalCut, 0);

  const fmtHours = (h) => {
    const mins = Math.round(h * 60);
    return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Salary</h2>
          <p>Monthly ÷ 30 = per-day · deductions from unpaid leave + short hours (₹{SHORT_RATE}/hr)</p>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">Gross payroll — {monthLabel(month)}</div>
          <div className="stat-value">{inr(gross)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total deductions</div>
          <div className="stat-value" style={{ color: "#b91c1c" }}>−{inr(dedTotal)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Net payable</div>
          <div className="stat-value">{inr(netTotal)}</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Employee</th><th style={{ textAlign: "right" }}>Per day</th>
                <th style={{ textAlign: "right" }}>Monthly</th>
                <th style={{ textAlign: "right" }}>Short hours</th>
                <th style={{ textAlign: "right" }}>Deduction</th>
                <th style={{ textAlign: "right" }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const r = row(e);
                return (
                  <tr key={e._id}>
                    <td>
                      <div className="person">
                        <Avatar user={e} />
                        <div>
                          <div className="p-name">{e.name}</div>
                          <div className="p-sub">{e.designation || e.department || e.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>{inr(r.perDay)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{inr(e.monthlySalary)}</td>
                    <td style={{ textAlign: "right" }}>
                      {r.shortHours > 0 ? <span style={{ color: "#b91c1c" }}>{fmtHours(r.shortHours)}</span> : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {r.totalCut > 0 ? (
                        <>
                          <span style={{ color: "#b91c1c", fontWeight: 700 }}>−{inr(r.totalCut)}</span>
                          <div className="p-sub">
                            {r.shortCut > 0 && <>{inr(r.shortCut)} short hrs</>}
                            {r.shortCut > 0 && r.leaveCut > 0 && " · "}
                            {r.leaveCut > 0 && <>{inr(r.leaveCut)} leave ({r.salaryDays}d)</>}
                          </div>
                        </>
                      ) : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{inr(r.net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { fetchEmployees, fetchLeaves } from "../../api/panel";
import { inr, monthLabel, thisMonth } from "../utils";
import Avatar from "../Avatar";

export default function SalaryPage() {
  const [list, setList] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(thisMonth());

  useEffect(() => {
    Promise.all([fetchEmployees(), fetchLeaves({ status: "approved" })])
      .then(([emps, lv]) => { setList(emps); setLeaves(lv); })
      .finally(() => setLoading(false));
  }, []);

  // approved leaves in the selected month → deduction days per employee
  const ded = {}; // empId -> { salary, leave }
  for (const l of leaves) {
    if (String(l.fromDate).slice(0, 7) !== month) continue;
    const id = l.employee?._id || l.employee;
    (ded[id] ||= { salary: 0, leave: 0 })[l.deductType || "leave"] += l.deductionDays || 0;
  }

  const row = (e) => {
    const perDay = (e.monthlySalary || 0) / 30;
    const d = ded[e._id] || { salary: 0, leave: 0 };
    const salaryCut = d.salary * perDay;
    return { perDay, salaryDays: d.salary, leaveDays: d.leave, salaryCut, net: (e.monthlySalary || 0) - salaryCut };
  };

  const gross = list.reduce((s, e) => s + (e.monthlySalary || 0), 0);
  const netTotal = list.reduce((s, e) => s + row(e).net, 0);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Salary</h2>
          <p>Monthly salary ÷ 30 = per-day · deductions from approved leaves</p>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">Gross payroll — {monthLabel(month)}</div>
          <div className="stat-value">{inr(gross)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Net payable</div>
          <div className="stat-value">{inr(netTotal)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">People</div>
          <div className="stat-value">{list.length}</div>
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
                      {r.salaryDays > 0 ? <span style={{ color: "#b91c1c", fontWeight: 700 }}>−{inr(r.salaryCut)} <small>({r.salaryDays}d)</small></span> : "—"}
                      {r.leaveDays > 0 && <div className="p-sub">{r.leaveDays}d from leave</div>}
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

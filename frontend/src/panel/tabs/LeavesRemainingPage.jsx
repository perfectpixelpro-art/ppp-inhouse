import { useEffect, useState } from "react";
import { fetchLeaveBalance } from "../../api/panel";
import Avatar from "../Avatar";

export default function LeavesRemainingPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaveBalance().then(setList).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Leaves Remaining</h2>
          <p>Remaining paid-leave balance per employee</p>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Employee</th><th>Allowance</th><th>Used</th><th>Remaining</th><th>Salary cut</th><th>Balance</th></tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const pct = e.allowance ? Math.round((e.remaining / e.allowance) * 100) : 0;
                return (
                  <tr key={e._id}>
                    <td>
                      <div className="person">
                        <Avatar user={e} size={32} />
                        <div>
                          <div className="p-name">{e.name}</div>
                          <div className="p-sub">{e.designation || e.department}</div>
                        </div>
                      </div>
                    </td>
                    <td>{e.allowance}</td>
                    <td>{e.used}</td>
                    <td style={{ fontWeight: 700 }}>{e.remaining}</td>
                    <td style={{ fontWeight: 700, color: e.salaryCut ? "var(--red)" : undefined }}>
                      {e.salaryCut ? `${e.salaryCut} day${e.salaryCut === 1 ? "" : "s"}` : "—"}
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <div style={{ background: "var(--gray-200)", borderRadius: 999, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: pct > 25 ? "var(--red)" : "#a16207" }} />
                      </div>
                    </td>
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

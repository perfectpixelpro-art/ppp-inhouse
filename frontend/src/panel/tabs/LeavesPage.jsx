import { useEffect, useState } from "react";
import { fetchLeaves } from "../../api/panel";
import { fmtDate } from "../utils";
import Avatar from "../Avatar";

export default function LeavesPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchLeaves(status ? { status } : {})
      .then(setList)
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Leaves</h2>
          <p>Which employee took leave on which days</p>
        </div>
      </div>

      <div className="toolbar">
        <label>Status:</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l._id}>
                  <td>
                    <div className="person">
                      <Avatar user={l.employee} size={32} />
                      <span className="p-name">{l.employee?.name}</span>
                    </div>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{l.type}</td>
                  <td>{fmtDate(l.fromDate)}</td>
                  <td>{fmtDate(l.toDate)}</td>
                  <td>{l.days}</td>
                  <td>{l.reason || "—"}</td>
                  <td><span className={`badge badge-${l.status}`}>{l.status}</span></td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={7} className="empty">No leave records.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

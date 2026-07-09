import { useEffect, useState } from "react";
import { fetchLeaves, setLeaveStatus } from "../../api/panel";
import { fmtDate } from "../utils";
import Avatar from "../Avatar";
import Modal from "../Modal";

export default function LeaveApplicationsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null); // the leave being reviewed
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewImg, setViewImg] = useState(null);

  const load = () => {
    setLoading(true);
    fetchLeaves({ status: "pending" }).then(setList).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openReview = (l) => { setActive(l); setNote(""); };

  const act = async (status) => {
    setBusy(true);
    try {
      await setLeaveStatus(active._id, status, note);
      setActive(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Leave Applications</h2>
          <p>Click a request to review, then approve or reject with a note</p>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : list.length === 0 ? (
        <div className="empty">🎉 No pending applications.</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Proof</th><th></th></tr></thead>
            <tbody>
              {list.map((l) => (
                <tr key={l._id} style={{ cursor: "pointer" }} onClick={() => openReview(l)}>
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
                  <td>{l.attachment ? "📎" : "—"}</td>
                  <td><button className="btn btn-ghost btn-sm">Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <Modal
          title="Review Leave Application"
          onClose={() => setActive(null)}
          footer={
            <>
              <button className="btn btn-danger" disabled={busy} onClick={() => act("rejected")}>Reject</button>
              <button className="btn btn-ghost" disabled={busy} onClick={() => act("pending")}
                title="Keep pending and send the note to the employee (e.g. asking for documents)">Review</button>
              <button className="btn btn-success" disabled={busy} onClick={() => act("approved")}>Approve</button>
            </>
          }
        >
          <div className="person" style={{ marginBottom: "1rem" }}>
            <Avatar user={active.employee} size={44} />
            <div>
              <div className="p-name">{active.employee?.name}</div>
              <div className="p-sub">{active.employee?.designation || active.employee?.department}</div>
            </div>
          </div>

          <div className="review-grid">
            <div><span className="rg-label">Type</span><span style={{ textTransform: "capitalize" }}>{active.type}</span></div>
            <div><span className="rg-label">Days</span><span>{active.days}</span></div>
            <div><span className="rg-label">From</span><span>{fmtDate(active.fromDate)}</span></div>
            <div><span className="rg-label">To</span><span>{fmtDate(active.toDate)}</span></div>
            <div className="full"><span className="rg-label">Reason</span><span>{active.reason || "—"}</span></div>
            <div className="full">
              <span className="rg-label">Deduction</span>
              <span style={{ fontWeight: 700, color: active.deductType === "salary" ? "var(--red-dark)" : "#15803d" }}>
                {active.deductionDays} day{active.deductionDays === 1 ? "" : "s"} · {active.deductType === "salary" ? "salary cut" : "leave balance"}
                {active.deductReason ? <span style={{ fontWeight: 400, color: "var(--gray-600)" }}> ({active.deductReason})</span> : null}
              </span>
            </div>
          </div>

          {active.attachment && (
            <div style={{ margin: "0.75rem 0" }}>
              <span className="rg-label">Attachment</span>
              <img src={active.attachment} alt="proof" onClick={() => setViewImg(active.attachment)}
                style={{ maxHeight: 160, borderRadius: 8, border: "1px solid var(--gray-200)", cursor: "pointer", display: "block", marginTop: 4 }} />
            </div>
          )}

          <div className="form-field full" style={{ marginTop: "0.75rem" }}>
            <label>Note / reason (shown to the employee)</label>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Approved — enjoy your break / Rejected — insufficient balance" />
          </div>
        </Modal>
      )}

      {viewImg && (
        <Modal title="Attachment" onClose={() => setViewImg(null)}>
          <img src={viewImg} alt="attachment" style={{ maxWidth: "100%", borderRadius: 8 }} />
        </Modal>
      )}
    </div>
  );
}

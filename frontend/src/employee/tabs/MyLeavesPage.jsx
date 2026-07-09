import { useEffect, useState } from "react";
import { myLeaves, applyLeave, uploadFile, attachLeaveDoc } from "../../api/employee";
import { fmtDate } from "../../panel/utils";
import Modal from "../../panel/Modal";

const LEAVE_TYPES = ["casual", "sick", "paid", "unpaid"];
const blank = { type: "casual", fromDate: "", toDate: "", reason: "", attachment: "" };

export default function MyLeavesPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [viewImg, setViewImg] = useState(null);
  const [attaching, setAttaching] = useState(null); // leave id currently uploading

  const load = () => {
    setLoading(true);
    myLeaves().then(setList).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await uploadFile(file);
      setForm((f) => ({ ...f, attachment: url }));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setUploading(false);
    }
  };

  // Attach a document to an already-submitted pending request (recomputes deduction)
  const attachLater = (leaveId) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttaching(leaveId);
    setError("");
    try {
      const { url } = await uploadFile(file);
      await attachLeaveDoc(leaveId, url);
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setAttaching(null);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await applyLeave(form);
      setShow(false);
      setForm(blank);
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Leave Application</h2>
          <p>Apply for leave and track your requests</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShow(true)}>+ Apply for Leave</button>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Proof</th><th>Status</th><th>Remarks</th></tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l._id}>
                  <td style={{ textTransform: "capitalize" }}>{l.type}</td>
                  <td>{fmtDate(l.fromDate)}</td>
                  <td>{fmtDate(l.toDate)}</td>
                  <td>{l.days}</td>
                  <td>{l.reason || "—"}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {l.attachment ? (
                        <img src={l.attachment} alt="proof" onClick={() => setViewImg(l.attachment)}
                          style={{ height: 32, width: 32, objectFit: "cover", borderRadius: 6, cursor: "pointer", border: "1px solid var(--gray-200)" }} />
                      ) : !(l.status === "pending") && "—"}
                      {l.status === "pending" && (
                        <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer", margin: 0 }}>
                          {attaching === l._id ? "Uploading…" : l.attachment ? "Replace" : "📎 Attach"}
                          <input type="file" accept="image/*" hidden disabled={attaching === l._id} onChange={attachLater(l._id)} />
                        </label>
                      )}
                    </div>
                  </td>
                  <td><span className={`badge badge-${l.status}`}>{l.status}</span></td>
                  <td style={{ maxWidth: 220 }}>
                    {l.reviewNote
                      ? <span style={{ color: l.status === "rejected" ? "var(--red-dark)" : "#15803d" }}>{l.reviewNote}</span>
                      : <span style={{ color: "var(--gray-400)" }}>—</span>}
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8} className="empty">No leave applications yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {show && (
        <Modal
          title="Apply for Leave"
          onClose={() => setShow(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || uploading}>{saving ? "Submitting…" : "Submit"}</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form className="form-grid" onSubmit={save}>
            <div className="form-field">
              <label>Type</label>
              <select value={form.type} onChange={set("type")}>
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field" />
            <div className="form-field">
              <label>From *</label>
              <input type="date" value={form.fromDate} onChange={set("fromDate")} required />
            </div>
            <div className="form-field">
              <label>To *</label>
              <input type="date" value={form.toDate} onChange={set("toDate")} required />
            </div>
            <div className="form-field full">
              <label>Reason</label>
              <textarea rows={3} value={form.reason} onChange={set("reason")} />
            </div>
            <div className="form-field full">
              <label>Attach image (optional) — e.g. medical certificate</label>
              <input type="file" accept="image/*" onChange={handleImage} />
              {uploading && <span style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>Uploading…</span>}
              {form.attachment && (
                <img src={form.attachment} alt="preview" style={{ marginTop: 8, maxHeight: 120, borderRadius: 8, border: "1px solid var(--gray-200)" }} />
              )}
            </div>
          </form>
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

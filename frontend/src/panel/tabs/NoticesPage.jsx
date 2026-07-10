import { useEffect, useState } from "react";
import { fetchNotices, createNotice, deleteNotice, fetchEmployees, uploadFile } from "../../api/panel";
import { fmtDate } from "../utils";
import Avatar from "../Avatar";
import Modal from "../Modal";

const blank = { message: "", image: "", audience: "all", employee: "" };

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [viewAcks, setViewAcks] = useState(null);

  const load = () => { fetchNotices().then(setNotices).finally(() => setLoading(false)); };
  useEffect(load, []);
  useEffect(() => { fetchEmployees({ role: "employee" }).then(setEmployees); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try { const { url } = await uploadFile(file); setForm((f) => ({ ...f, image: url })); }
    catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setUploading(false); }
  };

  const publish = async () => {
    setBusy(true); setError("");
    try {
      await createNotice({ ...form, employee: form.audience === "user" ? form.employee : undefined });
      setShow(false); setForm(blank); load();
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setBusy(false); }
  };

  const remove = async (n) => { if (window.confirm("Delete this notice?")) { await deleteNotice(n._id); load(); } };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Notices</h2>
          <p>Publish a message or image to all employees or one person — and see who acknowledged</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShow(true)}>+ New Notice</button>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : notices.length === 0 ? (
        <div className="empty">No notices yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Notice</th><th>Audience</th><th>Published</th><th>Acknowledged</th><th></th></tr></thead>
            <tbody>
              {notices.map((n) => (
                <tr key={n._id}>
                  <td style={{ maxWidth: 320 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {n.image && <img src={n.image} alt="" style={{ height: 40, width: 40, objectFit: "cover", borderRadius: 6, border: "1px solid var(--gray-200)" }} />}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.message || <em>Image only</em>}</span>
                    </div>
                  </td>
                  <td>{n.audience === "all" ? <span className="badge badge-black">All</span> : <span className="badge badge-neutral">{n.employee?.name || "One"}</span>}</td>
                  <td>{fmtDate(n.createdAt)}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setViewAcks(n)}>
                      {n.acks.length} ack{n.acks.length === 1 ? "" : "s"}
                    </button>
                  </td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(n)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {show && (
        <Modal
          title="New Notice"
          onClose={() => setShow(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={publish} disabled={busy || uploading}>{busy ? "Publishing…" : "Publish"}</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <div className="form-field full">
            <label>Message</label>
            <textarea rows={4} value={form.message} onChange={set("message")} placeholder="Write the announcement…" />
          </div>
          <div className="form-field full">
            <label>Image (optional)</label>
            <input type="file" accept="image/*" onChange={handleImage} />
            {uploading && <span style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}> Uploading…</span>}
            {form.image && <img src={form.image} alt="preview" style={{ marginTop: 8, maxHeight: 140, borderRadius: 8, border: "1px solid var(--gray-200)" }} />}
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label>Show to</label>
              <select value={form.audience} onChange={set("audience")}>
                <option value="all">All employees</option>
                <option value="user">One employee</option>
              </select>
            </div>
            {form.audience === "user" && (
              <div className="form-field">
                <label>Employee</label>
                <select value={form.employee} onChange={set("employee")} required>
                  <option value="">Select…</option>
                  {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </Modal>
      )}

      {viewAcks && (
        <Modal title="Acknowledgements" onClose={() => setViewAcks(null)}>
          {viewAcks.acks.length === 0 ? (
            <div className="empty">No one has acknowledged yet.</div>
          ) : (
            <div className="day-detail">
              {viewAcks.acks.map((a, i) => (
                <div key={i} className="day-detail-card">
                  <div className="person" style={{ marginBottom: a.note ? 6 : 0 }}>
                    <Avatar user={a.employee} size={32} />
                    <div>
                      <div className="p-name">{a.employee?.name || "Employee"}</div>
                      <div className="p-sub">{fmtDate(a.at)}</div>
                    </div>
                  </div>
                  {a.note && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{a.note}</p>}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

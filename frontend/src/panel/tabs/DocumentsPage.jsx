import { useEffect, useState } from "react";
import { fetchDocuments, createDocument, deleteDocument, fetchEmployees, uploadFile } from "../../api/panel";
import { fmtDate } from "../utils";
import Avatar from "../Avatar";
import Modal from "../Modal";

const DOC_TYPES = ["aadhar", "pan", "passport", "driving-license", "resume", "offer-letter", "other"];
const blank = { employee: "", docType: "aadhar", number: "", images: [], note: "" };

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleImages = async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const urls = [];
      for (const file of files) urls.push((await uploadFile(file)).url);
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const load = () => {
    setLoading(true);
    fetchDocuments(filter ? { employee: filter } : {})
      .then(setDocs)
      .finally(() => setLoading(false));
  };
  useEffect(load, [filter]);
  useEffect(() => { fetchEmployees().then(setEmployees); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createDocument(form);
      setShow(false);
      setForm(blank);
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d) => {
    if (!window.confirm("Delete this document?")) return;
    await deleteDocument(d._id);
    load();
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Documents</h2>
          <p>Aadhaar, PAN and other documents of every employee</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShow(true)}>+ Add Document</button>
      </div>

      <div className="toolbar">
        <label>Employee:</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All</option>
          {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Employee</th><th>Type</th><th>Number</th><th>Added</th><th>File</th><th></th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d._id}>
                  <td>
                    <div className="person">
                      <Avatar user={d.employee} size={32} />
                      <span className="p-name">{d.employee?.name}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-black">{d.docType}</span></td>
                  <td style={{ fontFamily: "monospace" }}>{d.number || "—"}</td>
                  <td>{fmtDate(d.createdAt)}</td>
                  <td>
                    {(d.images?.length ? d.images : d.fileUrl ? [d.fileUrl] : []).length ? (
                      <div className="doc-thumbs">
                        {(d.images?.length ? d.images : [d.fileUrl]).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt="doc" /></a>
                        ))}
                      </div>
                    ) : "—"}
                  </td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(d)}>Delete</button></td>
                </tr>
              ))}
              {docs.length === 0 && <tr><td colSpan={6} className="empty">No documents.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {show && (
        <Modal
          title="Add Document"
          onClose={() => setShow(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </>
          }
        >
          {error && <div className="error-banner">{error}</div>}
          <form className="form-grid" onSubmit={save}>
            <div className="form-field">
              <label>Employee *</label>
              <select value={form.employee} onChange={set("employee")} required>
                <option value="">Select…</option>
                {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Type *</label>
              <select value={form.docType} onChange={set("docType")}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Number</label>
              <input value={form.number} onChange={set("number")} />
            </div>
            <div className="form-field full">
              <label>Document images (select one or more)</label>
              <input type="file" accept="image/*" multiple onChange={handleImages} />
              {uploading && <span style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>Uploading…</span>}
              {form.images.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {form.images.map((url, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={url} alt="" style={{ height: 72, width: 72, objectFit: "cover", borderRadius: 8, border: "1px solid var(--gray-200)" }} />
                      <button type="button" onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                        style={{ position: "absolute", top: -6, right: -6, background: "var(--red)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-field full">
              <label>Note</label>
              <input value={form.note} onChange={set("note")} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

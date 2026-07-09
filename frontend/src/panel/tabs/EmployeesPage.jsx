import { useEffect, useState } from "react";
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee, uploadFile } from "../../api/panel";
import { fmtDate } from "../utils";
import Avatar from "../Avatar";
import Modal from "../Modal";

const blank = {
  name: "", email: "", password: "", designation: "", department: "",
  photo: "", birthdate: "", phone: "", role: "employee", monthlySalary: "", slackUserId: "",
  probationStart: "", probationEnd: "", noProbation: false,
};

export default function EmployeesPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchEmployees({ role: "employee" }) // directory shows employees only — not admin/HR
      .then(setList)
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => { setEditing(null); setForm(blank); setShowModal(true); };
  const openEdit = (e) => {
    setEditing(e);
    setForm({
      name: e.name, email: e.email, password: "", designation: e.designation || "",
      department: e.department || "", photo: e.photo || "",
      birthdate: e.birthdate ? e.birthdate.slice(0, 10) : "", phone: e.phone || "",
      role: e.role, monthlySalary: e.monthlySalary || "", slackUserId: e.slackUserId || "",
      probationStart: e.probationStart ? e.probationStart.slice(0, 10) : "",
      probationEnd: e.probationEnd ? e.probationEnd.slice(0, 10) : "",
      noProbation: !e.probationStart && !e.probationEnd,
    });
    setShowModal(true);
  };

  const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));

  const handlePhoto = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await uploadFile(file);
      setForm((f) => ({ ...f, photo: url }));
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { noProbation, ...payload } = { ...form, monthlySalary: Number(form.monthlySalary) || 0 };
      if (!payload.birthdate) delete payload.birthdate;
      if (noProbation) {
        // explicitly clear on the server (null, not just omitted)
        payload.probationStart = null;
        payload.probationEnd = null;
      } else {
        if (!payload.probationStart) delete payload.probationStart;
        if (!payload.probationEnd) delete payload.probationEnd;
      }
      if (editing) {
        if (!payload.password) delete payload.password;
        await updateEmployee(editing._id, payload);
      } else {
        await createEmployee(payload);
      }
      setShowModal(false);
      load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (e) => {
    if (!window.confirm(`Delete ${e.name}?`)) return;
    await deleteEmployee(e._id);
    load();
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Employees</h2>
          <p>{list.length} people in the organization</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Employee</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Designation</th>
                <th>Department</th><th>Birthdate</th><th>Role</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e._id}>
                  <td>
                    <div className="person">
                      <Avatar user={e} />
                      <span className="p-name">{e.name}</span>
                    </div>
                  </td>
                  <td>{e.email}</td>
                  <td>{e.designation || "—"}</td>
                  <td>{e.department || "—"}</td>
                  <td>{fmtDate(e.birthdate)}</td>
                  <td><span className={`badge ${e.role === "employee" ? "badge-neutral" : "badge-black"}`}>{e.role}</span></td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>Edit</button>{" "}
                    <button className="btn btn-danger btn-sm" onClick={() => remove(e)}>Delete</button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={7} className="empty">No employees yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit Employee" : "Add Employee"}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <form className="form-grid" onSubmit={save}>
            <div className="form-field">
              <label>Full name *</label>
              <input value={form.name} onChange={set("name")} required />
            </div>
            <div className="form-field">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={set("email")} required />
            </div>
            <div className="form-field">
              <label>{editing ? "New password (optional)" : "Password *"}</label>
              <input type="text" value={form.password} onChange={set("password")} required={!editing} />
            </div>
            <div className="form-field">
              <label>Role</label>
              <select value={form.role} onChange={set("role")}>
                <option value="employee">Employee</option>
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-field">
              <label>Designation *</label>
              <input value={form.designation} onChange={set("designation")} required />
            </div>
            <div className="form-field">
              <label>Department</label>
              <input value={form.department} onChange={set("department")} />
            </div>
            <div className="form-field">
              <label>Birthdate</label>
              <input type="date" value={form.birthdate} onChange={set("birthdate")} />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input value={form.phone} onChange={set("phone")} />
            </div>
            <div className="form-field">
              <label>Monthly salary (₹)</label>
              <input type="number" value={form.monthlySalary} onChange={set("monthlySalary")} />
            </div>
            <div className="form-field">
              <label>Slack user ID</label>
              <input value={form.slackUserId} onChange={set("slackUserId")} placeholder="U06H1E2GU3H" />
            </div>
            <div className="form-field full">
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ width: "auto" }}
                  checked={form.noProbation}
                  onChange={(ev) =>
                    setForm((f) => ({ ...f, noProbation: ev.target.checked, probationStart: "", probationEnd: "" }))
                  }
                />
                No probation
              </label>
            </div>
            <div className="form-field">
              <label>Probation start</label>
              <input type="date" value={form.probationStart} onChange={set("probationStart")} disabled={form.noProbation} />
            </div>
            <div className="form-field">
              <label>Probation end</label>
              <input type="date" value={form.probationEnd} onChange={set("probationEnd")} disabled={form.noProbation} />
            </div>
            <div className="form-field full">
              <label>Photo</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {form.photo && (
                  <img src={form.photo} alt="preview"
                    style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--gray-200)" }} />
                )}
                <div style={{ flex: 1 }}>
                  <input type="file" accept="image/*" onChange={handlePhoto} />
                  {uploading && <span style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}> Uploading…</span>}
                </div>
              </div>
            </div>
            <div className="form-field full">
              <label>…or paste a photo URL</label>
              <input value={form.photo} onChange={set("photo")} placeholder="https://…" />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { fetchHolidays, createHoliday, deleteHoliday } from "../../api/panel";
import { fmtDate } from "../utils";
import Calendar from "../Calendar";
import Modal from "../Modal";

const blank = { name: "", date: "", type: "national", description: "" };

// Tab 6: national/company special days on a calendar.
export default function SpecialDaysPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetchHolidays().then(setList).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createHoliday(form);
      setShow(false);
      setForm(blank);
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (h) => {
    if (!window.confirm(`Delete "${h.name}"?`)) return;
    await deleteHoliday(h._id);
    load();
  };

  const events = list.map((h) => ({ date: h.date, label: h.name, kind: "holiday" }));

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Special Days</h2>
          <p>National holidays &amp; company special days</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShow(true)}>+ Add Special Day</button>
      </div>

      <Calendar events={events} />

      <h3 style={{ margin: "1.5rem 0 0.75rem", fontSize: "1rem" }}>All special days</h3>
      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Name</th><th>Date</th><th>Type</th><th>Description</th><th></th></tr></thead>
            <tbody>
              {list.map((h) => (
                <tr key={h._id}>
                  <td className="p-name">{h.name}</td>
                  <td>{fmtDate(h.date)}</td>
                  <td><span className="badge badge-red">{h.type}</span></td>
                  <td>{h.description || "—"}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(h)}>Delete</button></td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={5} className="empty">No special days yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {show && (
        <Modal
          title="Add Special Day"
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
            <div className="form-field full">
              <label>Name *</label>
              <input value={form.name} onChange={set("name")} required />
            </div>
            <div className="form-field">
              <label>Date *</label>
              <input type="date" value={form.date} onChange={set("date")} required />
            </div>
            <div className="form-field">
              <label>Type</label>
              <select value={form.type} onChange={set("type")}>
                <option value="national">National</option>
                <option value="festival">Festival</option>
                <option value="company">Company</option>
                <option value="special">Special</option>
              </select>
            </div>
            <div className="form-field full">
              <label>Description</label>
              <input value={form.description} onChange={set("description")} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

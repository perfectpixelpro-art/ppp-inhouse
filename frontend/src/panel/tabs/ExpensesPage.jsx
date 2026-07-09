import { useEffect, useState } from "react";
import { fetchExpenses, createExpense, deleteExpense } from "../../api/panel";
import { inr, fmtDate, thisMonth, monthLabel } from "../utils";
import Modal from "../Modal";

const CATEGORIES = ["salary", "office", "travel", "utilities", "equipment", "marketing", "other"];
const blank = { title: "", amount: "", category: "office", date: "", note: "" };

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(thisMonth());
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetchExpenses({ month })
      .then((d) => { setExpenses(d.expenses); setTotal(d.total); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [month]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createExpense({ ...form, amount: Number(form.amount), date: form.date || undefined });
      setShow(false);
      setForm(blank);
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (x) => {
    if (!window.confirm(`Delete "${x.title}"?`)) return;
    await deleteExpense(x._id);
    load();
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Expenses</h2>
          <p>Calculated expenses of the month</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShow(true)}>+ Add Expense</button>
      </div>

      <div className="toolbar">
        <label>Month:</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">Total — {monthLabel(month)}</div>
          <div className="stat-value">{inr(total)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Entries</div>
          <div className="stat-value">{expenses.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Added by</th><th style={{ textAlign: "right" }}>Amount</th><th></th></tr></thead>
            <tbody>
              {expenses.map((x) => (
                <tr key={x._id}>
                  <td className="p-name">{x.title}</td>
                  <td><span className="badge badge-neutral">{x.category}</span></td>
                  <td>{fmtDate(x.date)}</td>
                  <td>{x.addedBy?.name || "—"}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{inr(x.amount)}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(x)}>Delete</button></td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={6} className="empty">No expenses this month.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {show && (
        <Modal
          title="Add Expense"
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
              <label>Title *</label>
              <input value={form.title} onChange={set("title")} required />
            </div>
            <div className="form-field">
              <label>Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={set("amount")} required />
            </div>
            <div className="form-field">
              <label>Category</label>
              <select value={form.category} onChange={set("category")}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={set("date")} />
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

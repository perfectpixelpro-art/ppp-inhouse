import { useEffect, useState } from "react";
import { fetchExpenses, createExpense, deleteExpense } from "../../api/panel";
import { inr, fmtDate, thisMonth, monthLabel } from "../utils";
import Modal from "../Modal";

const CATEGORIES = ["salary", "office", "travel", "utilities", "equipment", "marketing", "other"];
const blank = { title: "", amount: "", category: "office", date: "", note: "", paidBy: "" };

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(thisMonth());
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null); // expense being viewed

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
            <thead><tr><th>Title</th><th>Category</th><th>Reason</th><th>Paid by</th><th>Date</th><th style={{ textAlign: "right" }}>Amount</th><th></th></tr></thead>
            <tbody>
              {expenses.map((x) => (
                <tr key={x._id} style={{ cursor: "pointer" }} onClick={() => setDetail(x)}>
                  <td className="p-name" style={{ textDecoration: "underline dotted" }}>{x.title}</td>
                  <td><span className="badge badge-neutral">{x.category}</span></td>
                  <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={x.note || ""}>{x.note || "—"}</td>
                  <td>{x.paidBy || x.addedBy?.name || "—"}</td>
                  <td>{fmtDate(x.date)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{inr(x.amount)}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); remove(x); }}>Delete</button></td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={7} className="empty">No expenses this month.</td></tr>}
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
            <div className="form-field">
              <label>Paid by</label>
              <input value={form.paidBy} onChange={set("paidBy")} placeholder="Who paid — e.g. Deepak, petty cash" />
            </div>
            <div className="form-field full">
              <label>Reason</label>
              <input value={form.note} onChange={set("note")} placeholder="Why this expense was made" />
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)}>
          <div className="review-grid">
            <div><span className="rg-label">Amount</span><span style={{ fontWeight: 700 }}>{inr(detail.amount)}</span></div>
            <div><span className="rg-label">Category</span><span style={{ textTransform: "capitalize" }}>{detail.category}</span></div>
            <div><span className="rg-label">Date</span><span>{fmtDate(detail.date)}</span></div>
            <div><span className="rg-label">Paid by</span><span>{detail.paidBy || detail.addedBy?.name || "—"}</span></div>
            <div className="full"><span className="rg-label">Reason</span><span>{detail.note || "—"}</span></div>
            <div className="full"><span className="rg-label">Added by</span><span>{detail.addedBy?.name || "—"} · {fmtDate(detail.createdAt)}</span></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

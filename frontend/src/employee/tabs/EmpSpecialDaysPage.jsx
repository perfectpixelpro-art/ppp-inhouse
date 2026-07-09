import { useEffect, useState } from "react";
import { fetchHolidays } from "../../api/employee";
import { fmtDate } from "../../panel/utils";
import Calendar from "../../panel/Calendar";

export default function EmpSpecialDaysPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHolidays().then(setList).finally(() => setLoading(false));
  }, []);

  const events = list.map((h) => ({ date: h.date, label: h.name, kind: "holiday" }));

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Special Days</h2>
          <p>National holidays &amp; company special days</p>
        </div>
      </div>

      <Calendar events={events} />

      <h3 style={{ margin: "1.5rem 0 0.75rem", fontSize: "1rem" }}>All special days</h3>
      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Name</th><th>Date</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              {list.map((h) => (
                <tr key={h._id}>
                  <td className="p-name">{h.name}</td>
                  <td>{fmtDate(h.date)}</td>
                  <td><span className="badge badge-red">{h.type}</span></td>
                  <td>{h.description || "—"}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={4} className="empty">No special days yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

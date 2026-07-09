import { useEffect, useState } from "react";
import { fetchEmployees } from "../../api/panel";
import { fmtDate, daysUntilBirthday } from "../utils";
import Avatar from "../Avatar";

export default function BirthdaysPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees().then(setList).finally(() => setLoading(false));
  }, []);

  const withBday = list
    .filter((e) => e.birthdate)
    .map((e) => ({ ...e, days: daysUntilBirthday(e.birthdate) }))
    .sort((a, b) => a.days - b.days);

  const label = (days) => (days === 0 ? "🎉 Today!" : days === 1 ? "Tomorrow" : `in ${days} days`);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Birthdays</h2>
          <p>Upcoming birthdays of every employee</p>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Employee</th><th>Designation</th><th>Birthday</th><th>Coming up</th></tr></thead>
            <tbody>
              {withBday.map((e) => (
                <tr key={e._id} style={e.days === 0 ? { background: "#fff1f2" } : undefined}>
                  <td>
                    <div className="person">
                      <Avatar user={e} />
                      <span className="p-name">{e.name}</span>
                    </div>
                  </td>
                  <td>{e.designation || "—"}</td>
                  <td>{fmtDate(e.birthdate)}</td>
                  <td><span className={`badge ${e.days <= 7 ? "badge-red" : "badge-neutral"}`}>{label(e.days)}</span></td>
                </tr>
              ))}
              {withBday.length === 0 && <tr><td colSpan={4} className="empty">No birthdates on record.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

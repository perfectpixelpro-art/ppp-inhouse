import { useEffect, useState } from "react";
import { fetchHolidays } from "../../api/employee";
import { importHolidaysCalendar } from "../../api/panel";
import { useAuth } from "../../context/AuthContext";
import { fmtDay } from "../../panel/utils";
import Calendar from "../../panel/Calendar";

const daysUntil = (d) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d);
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((t - today) / 86400000);
};

const label = (n) => (n === 0 ? "🎉 Today!" : n === 1 ? "Tomorrow" : `in ${n} days`);

export default function EmpUpcomingHolidaysPage() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "hr";
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncMsg, setSyncMsg] = useState("");
  const [syncing, setSyncing] = useState(false);

  const load = () =>
    fetchHolidays()
      .then((hs) => setList(hs.filter((h) => h.type === "national").sort((a, b) => new Date(a.date) - new Date(b.date))))
      .finally(() => setLoading(false));

  const syncCalendar = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const { count } = await importHolidaysCalendar();
      setSyncMsg(`Imported ${count} holidays from Google Calendar`);
      await load();
    } catch (e) {
      setSyncMsg(e.response?.data?.message || e.message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>National Holidays</h2>
          <p>Company holiday calendar</p>
        </div>
        {isStaff && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {syncMsg && <span style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>{syncMsg}</span>}
            <button className="btn btn-dark" onClick={syncCalendar} disabled={syncing}>
              {syncing ? "Syncing…" : "📅 Sync from Google Calendar"}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : list.length === 0 ? (
        <div className="empty">No upcoming holidays.</div>
      ) : (
        <>
        <div style={{ marginBottom: "1.5rem" }}>
          <Calendar events={list.map((h) => ({ date: h.date, label: h.name, kind: "holiday" }))} />
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Holiday</th><th>Date</th><th>Type</th></tr>
            </thead>
            <tbody>
              {list.map((h) => {
                const n = daysUntil(h.date);
                return (
                  <tr key={h._id} style={n === 0 ? { background: "#fff1f2" } : undefined}>
                    <td className="p-name">{h.name}</td>
                    <td>{fmtDay(h.date)}</td>
                    <td><span className="badge badge-red">{h.type}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

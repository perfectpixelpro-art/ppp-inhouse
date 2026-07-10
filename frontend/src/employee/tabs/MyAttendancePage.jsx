import { useEffect, useRef, useState } from "react";
import { myAttendance, myToday, checkIn, checkOut, saveDsr, markRain } from "../../api/employee";
import { fmtDate, fmtTime } from "../../panel/utils";
import Modal from "../../panel/Modal";
import AttendanceCalendar from "../../panel/AttendanceCalendar";
import "./attendance.css";

const HOUR = 3600000;
// Target worked time depends on the day type chosen at check-in
const targetMs = (rec) => (rec?.dayType === "half" ? 4 : 8) * HOUR;

const workedNow = (rec, now) => {
  if (!rec) return 0;
  let ms = rec.workedMs || 0;
  if (rec.state === "working" && rec.currentStart) {
    ms += now - new Date(rec.currentStart).getTime();
  }
  return ms;
};

const fmtDur = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
};

const fmtHm = (ms) => {
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

const fmtHours = (ms) => (ms / 3600000).toFixed(1) + " h";

// >= target green · within 30m below target yellow · else red
const workedClass = (ms, target) =>
  ms >= target ? "work-green" : ms >= target - 0.5 * HOUR ? "work-yellow" : "work-red";

const STATE_LABEL = {
  not_started: "Not started",
  working: "Working",
  on_lunch: "On lunch",
  on_break: "On short break",
  ended: "Day ended",
};

export default function MyAttendancePage() {
  const [today, setToday] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [dsrModal, setDsrModal] = useState(false);
  const [dsrText, setDsrText] = useState("");
  const [viewDsr, setViewDsr] = useState(null);
  const [histView, setHistView] = useState("table");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const tick = useRef(null);

  const refreshHistory = () => myAttendance().then(setRecords);

  const load = () => {
    Promise.all([myToday(), myAttendance()])
      .then(([t, recs]) => { setToday(t); setRecords(recs); })
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  useEffect(() => {
    clearInterval(tick.current);
    if (today?.state === "working") {
      tick.current = setInterval(() => setNow(Date.now()), 1000);
    }
    return () => clearInterval(tick.current);
  }, [today?.state]);

  // While the day is live, re-sync with the server every minute so the 8:30 PM
  // hard stop (applied server-side) reflects here without a manual refresh.
  useEffect(() => {
    const live = today && today.state !== "ended" && today.state !== "not_started";
    if (!live) return;
    const id = setInterval(() => {
      myToday().then((t) => t && setToday(t)).catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, [today?.state]);

  const act = async (fn) => {
    setBusy(true);
    setError("");
    setShowOptions(false);
    try {
      const updated = await fn();
      setToday(updated);
      setNow(Date.now());
      refreshHistory();
      return updated;
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const endDay = async () => {
    const updated = await act(() => checkOut("end"));
    if (updated) {
      setDsrText(updated.dsr || "");
      setDsrModal(true);
    }
  };

  const toggleRain = async (rain) => {
    setBusy(true);
    setError("");
    try {
      const updated = await markRain(rain);
      setToday(updated);
      refreshHistory();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitDsr = async () => {
    setBusy(true);
    try {
      const updated = await saveDsr(dsrText);
      setToday(updated);
      refreshHistory();
      setDsrModal(false);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const state = today?.state || "not_started";
  const isHalf = today?.dayType === "half";
  const target = targetMs(today);
  const worked = workedNow(today, now);
  const pct = Math.min(100, Math.round((worked / target) * 100));
  const remaining = Math.max(0, target - worked);
  const running = state === "working";
  const onBreak = state === "on_lunch" || state === "on_break";

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>In / Out</h2>
          <p>Full day 8 h · Half day 4 h (no lunch) — choose when you check in</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <>
          <div className={`timer-card state-${state}`}>
            <div className="timer-left">
              <div className="pill-row">
                <span className={`state-pill state-${state}`}>
                  <span className={`dot ${running ? "live" : ""}`} />
                  {STATE_LABEL[state]}
                </span>
                {today && state !== "not_started" && (
                  <span className={`day-tag ${isHalf ? "half" : "full"}`}>
                    {isHalf ? "Half day · 4h" : "Full day · 8h"}
                  </span>
                )}
              </div>
              <div className="timer-clock">{fmtDur(worked)}</div>
              <div className="timer-sub">
                {state === "ended"
                  ? `Total worked ${fmtHours(worked)} of ${target / HOUR} h`
                  : `${fmtHours(worked)} of ${target / HOUR} h · ${fmtHours(remaining)} left`}
              </div>
              <div className="timer-bar">
                <div className="timer-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="timer-meta">
                In: <strong>{fmtTime(today?.checkIn)}</strong>
                {today?.checkOut && <> · Out: <strong>{fmtTime(today.checkOut)}</strong></>}
                {today?.breaks?.length > 0 && <> · Breaks: <strong>{today.breaks.length}</strong></>}
              </div>
            </div>

            <div className="timer-actions">
              {state === "not_started" && (
                <div className="daytype-choice">
                  <span className="checkout-title">Start your day as…</span>
                  <button className="btn-big btn-in" disabled={busy} onClick={() => act(() => checkIn("full"))}>
                    ☀️ Full Day <small>8h</small>
                  </button>
                  <button className="btn-big btn-half" disabled={busy} onClick={() => act(() => checkIn("half"))}>
                    🌤 Half Day <small>4h · no lunch</small>
                  </button>
                </div>
              )}

              {onBreak && (
                <button className="btn-big btn-in" disabled={busy} onClick={() => act(() => checkIn())}>
                  Resume (Check In)
                </button>
              )}

              {running && !showOptions && (
                <button className="btn-big btn-out" disabled={busy} onClick={() => setShowOptions(true)}>
                  Check Out
                </button>
              )}

              {running && showOptions && (
                <div className="checkout-options">
                  <span className="checkout-title">Checking out for…</span>
                  {!isHalf && (
                    <button className="btn opt-lunch" disabled={busy} onClick={() => act(() => checkOut("lunch"))}>🍽 Lunch</button>
                  )}
                  <button className="btn opt-break" disabled={busy} onClick={() => act(() => checkOut("break"))}>☕ Short Break</button>
                  <button className="btn opt-end" disabled={busy} onClick={() => { setShowOptions(false); setConfirmEnd(true); }}>🏁 End of Day</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowOptions(false)}>Cancel</button>
                </div>
              )}

              {state === "ended" && (
                <div className="ended-actions">
                  <div className="ended-note">✅ Day complete</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setDsrText(today?.dsr || ""); setDsrModal(true); }}>
                    {today?.dsr ? "Edit report" : "Add report"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <label className="rain-toggle" title="Tick before checking in — HR is notified and no auto-deduction applies">
            <input
              type="checkbox"
              checked={!!today?.rain}
              disabled={busy || state !== "not_started"}
              onChange={(e) => toggleRain(e.target.checked)}
            />
            🌧 Mark today as a rain day {state === "not_started" ? "(before check-in)" : ""}
            {today?.rain && <span className="badge badge-neutral" style={{ marginLeft: 6 }}>Rain — HR notified</span>}
          </label>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1.5rem 0 0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>My history</h3>
            <div className="view-toggle">
              <button className={histView === "table" ? "active" : ""} onClick={() => setHistView("table")}>Table</button>
              <button className={histView === "calendar" ? "active" : ""} onClick={() => setHistView("calendar")}>Calendar</button>
            </div>
          </div>

          {histView === "calendar" ? (
            <AttendanceCalendar records={records} />
          ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th><th>In</th><th>Out</th><th>Worked</th>
                  <th>Status</th><th>Overtime</th><th>Short</th><th>Daily Task</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const ms = r.workedMs || 0;
                  const t = targetMs(r);
                  const ot = ms - t;
                  return (
                    <tr key={r._id}>
                      <td>{fmtDate(r.date)}</td>
                      <td style={{ color: "#15803d", fontWeight: 600 }}>{fmtTime(r.checkIn)}</td>
                      <td style={{ color: "var(--red-dark)", fontWeight: 600 }}>{fmtTime(r.checkOut)}</td>
                      <td>
                        {r.state === "ended"
                          ? <span className={`work-pill ${workedClass(ms, t)}`}>{fmtHm(ms)}</span>
                          : "—"}
                      </td>
                      <td>
                        <span className={`badge ${r.state === "ended" ? "badge-approved" : "badge-pending"}`}>
                          {STATE_LABEL[r.state] || r.status}
                        </span>
                        <span className={`day-tag sm ${r.dayType === "half" ? "half" : "full"}`}>
                          {r.dayType === "half" ? "Half" : "Full"}
                        </span>
                        {r.autoClosed && <span className="badge badge-red" style={{ marginLeft: 4 }}>⚠ {r.note}</span>}
                      </td>
                      <td>{ot > 60000 ? <span className="delta up">+{fmtHm(ot)}</span> : "—"}</td>
                      <td>{ot < -60000 ? <span className="delta down">−{fmtHm(-ot)}</span> : "—"}</td>
                      <td className="dsr-cell">
                        {r.dsr
                          ? <button className="dsr-link" onClick={() => setViewDsr(r)}>{r.dsr}</button>
                          : <span style={{ color: "var(--gray-400)" }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
                {records.length === 0 && <tr><td colSpan={8} className="empty">No attendance yet.</td></tr>}
              </tbody>
            </table>
          </div>
          )}
        </>
      )}

      {confirmEnd && (
        <Modal
          title="End your shift?"
          onClose={() => setConfirmEnd(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmEnd(false)}>No, keep working</button>
              <button className="btn btn-primary" disabled={busy} onClick={async () => { setConfirmEnd(false); await endDay(); }}>
                {busy ? "Ending…" : "Yes, end shift"}
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            Are you sure you want to end your shift? Your timer stops and today's record is closed —
            you can still fill your daily report afterwards.
          </p>
        </Modal>
      )}

      {dsrModal && (
        <Modal
          title="Daily Status Report"
          onClose={() => setDsrModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDsrModal(false)}>Skip</button>
              <button className="btn btn-primary" onClick={submitDsr} disabled={busy}>
                {busy ? "Saving…" : "Save Report"}
              </button>
            </>
          }
        >
          <div className="form-field full">
            <label>What did you work on today?</label>
            <textarea
              rows={7}
              autoFocus
              placeholder="• Task 1&#10;• Task 2&#10;• Meetings / blockers…"
              value={dsrText}
              onChange={(e) => setDsrText(e.target.value)}
            />
          </div>
        </Modal>
      )}

      {viewDsr && (
        <Modal title={`Daily Report — ${fmtDate(viewDsr.date)}`} onClose={() => setViewDsr(null)}>
          <p style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.6 }}>{viewDsr.dsr}</p>
        </Modal>
      )}
    </div>
  );
}

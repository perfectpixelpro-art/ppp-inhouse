import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import Holiday from "../models/Holiday.js";
import { getAuthUrl, exchangeCode, syncSheet, syncHolidaysToCalendar, fetchHolidaysFromCalendar, isConfigured, isAuthorized } from "../services/googleSheets.js";

const HOUR = 3600000;
const targetMs = (r) => (r.dayType === "half" ? 4 : 8) * HOUR;
const fmtHm = (ms) => {
  const m = Math.round(ms / 60000);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? (mm ? `${h}h ${mm}m` : `${h}h`) : `${mm}m`;
};
const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "";
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const STATUS_LABEL = { ended: "Ended", working: "Working", on_lunch: "On lunch", on_break: "On break", not_started: "Not started" };
const currentMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);

// The exact 10 table columns
const buildRows = (records) => {
  const header = ["Employee", "Date", "Day", "In", "Out", "Worked", "Overtime", "Short", "Status", "Daily Task"];
  const rows = records.map((r) => {
    const ms = r.workedMs || 0;
    const ended = r.state === "ended";
    const ot = ms - targetMs(r);
    return [
      r.employee?.name || "",
      fmtDate(r.date),
      r.dayType === "half" ? "Half" : "Full",
      fmtTime(r.checkIn) || "—",
      fmtTime(r.checkOut) || "—",
      ended ? fmtHm(ms) : "—",
      ended && ot > 60000 ? `+${fmtHm(ot)}` : "—",
      ended && ot < -60000 ? `-${fmtHm(-ot)}` : "—",
      STATUS_LABEL[r.state] || r.state,
      r.dsr || "—",
    ];
  });
  return { header, rows };
};

// Fetch a month's attendance (all employees), sync it to the live sheet.
export const syncMonth = async (month) => {
  const m = /^\d{4}-\d{2}$/.test(month || "") ? month : currentMonth();
  const records = await Attendance.find({ date: { $regex: `^${m}` } })
    .populate("employee", "name")
    .sort({ date: -1 });
  records.sort((a, b) => {
    const n = (a.employee?.name || "").localeCompare(b.employee?.name || "");
    return n !== 0 ? n : a.date.localeCompare(b.date);
  });
  const { header, rows } = buildRows(records);
  // Share the sheet with every admin & HR so they can all view it
  const staff = await User.find({ role: { $in: ["admin", "hr"] } }).select("email");
  const shareWith = staff.map((u) => u.email).filter(Boolean);
  const { url } = await syncSheet({ title: "PPP Attendance — Live", header, rows, shareWith });
  return { url, rows: rows.length, month: m };
};

// GET /api/google/status  — is the integration ready?
export const status = (req, res) => {
  res.json({ configured: isConfigured(), authorized: isAuthorized() });
};

// GET /api/google/auth  — kick off the one-time consent (open in a browser)
export const auth = (req, res) => {
  if (!isConfigured()) return res.status(400).send("Google OAuth client not configured in .env");
  res.redirect(getAuthUrl());
};

// GET /api/google/oauth2callback  — Google redirects here with a code
export const callback = async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send(`Authorization failed: ${error}`);
  if (!code) return res.status(400).send("Missing code");
  try {
    const tokens = await exchangeCode(code);
    const ok = !!tokens.refresh_token;
    res.send(
      `<html><body style="font-family:system-ui;text-align:center;padding:3rem">` +
        (ok
          ? `<h2>✅ Google Sheets connected</h2><p>Refresh token saved. You can close this tab and use “Sync to Google Sheet”.</p>`
          : `<h2>⚠️ No refresh token returned</h2><p>Remove this app under Google Account → Security → Third-party access, then try the authorize link again.</p>`) +
        `</body></html>`
    );
  } catch (e) {
    res.status(500).send("Token exchange failed: " + e.message);
  }
};

// POST /api/google/sync/holidays  — admin/hr — push national holidays to Google Calendar
export const syncHolidaysCalendar = async (req, res) => {
  if (!isAuthorized()) {
    return res.status(400).json({ message: "Google not connected yet. Visit /api/google/auth once." });
  }
  try {
    const holidays = await Holiday.find({ type: "national" }).sort({ date: 1 });
    const count = await syncHolidaysToCalendar(holidays);
    res.json({ count });
  } catch (e) {
    const scopeMsg = /insufficient|scope|forbidden/i.test(e.message)
      ? "Calendar access not granted — re-authorize at /api/google/auth."
      : e.message;
    res.status(500).json({ message: "Calendar sync failed: " + scopeMsg });
  }
};

// POST /api/google/import/holidays  — admin/hr — pull this + next year's national
// holidays from Google's public India calendar into our DB (upsert by name+day).
export const importHolidaysCalendar = async (req, res) => {
  if (!isAuthorized()) {
    return res.status(400).json({ message: "Google not connected yet. Visit /api/google/auth once." });
  }
  try {
    const y = new Date().getFullYear();
    const timeMin = new Date(Date.UTC(y, 0, 1)).toISOString();
    const timeMax = new Date(Date.UTC(y + 2, 0, 1)).toISOString(); // through end of next year
    const events = await fetchHolidaysFromCalendar({ timeMin, timeMax });
    let count = 0;
    for (const ev of events) {
      const [yy, mm, dd] = ev.date.split("-").map(Number);
      const start = new Date(Date.UTC(yy, mm - 1, dd));
      const end = new Date(start.getTime() + 86400000);
      await Holiday.updateOne(
        { name: ev.name, date: { $gte: start, $lt: end } },
        { $set: { name: ev.name, date: start, type: "national" } },
        { upsert: true }
      );
      count++;
    }
    res.json({ count });
  } catch (e) {
    const scopeMsg = /insufficient|scope|forbidden/i.test(e.message)
      ? "Calendar access not granted — re-authorize at /api/google/auth."
      : e.message;
    res.status(500).json({ message: "Import failed: " + scopeMsg });
  }
};

// POST /api/google/sync/attendance?month=YYYY-MM  — admin/hr
export const syncAttendance = async (req, res) => {
  if (!isAuthorized()) {
    return res.status(400).json({ message: "Google Sheets not connected yet. Visit /api/google/auth once." });
  }
  try {
    const result = await syncMonth(req.query.month);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: "Sync failed: " + e.message });
  }
};

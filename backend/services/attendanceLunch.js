import Attendance from "../models/Attendance.js";

// Fixed lunch window: 2:00–3:00 PM IST. IST is UTC+5:30, and `date` is a UTC
// YYYY-MM-DD key, so 14:00 IST == 08:30 UTC and 15:00 IST == 09:30 UTC.
export const lunchStartInstant = (date) => new Date(`${date}T08:30:00.000Z`);
export const lunchEndInstant = (date) => new Date(`${date}T09:30:00.000Z`);

const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
const hadLunch = (r) => (r.breaks || []).some((b) => b.type === "lunch");

// Auto-pause a FULL-day timer at 2 PM for lunch — but only if the person was
// already working before 2 PM and hasn't taken lunch yet. Worked time is banked
// up to 2 PM; they must resume manually (and can't before 3 PM — see checkIn).
// `nowMs` is injectable for deterministic tests.
export const applyLunchStop = async (record, nowMs = Date.now()) => {
  if (!record || record.dayType !== "full" || record.state !== "working") return record;
  if (hadLunch(record)) return record;

  const start = lunchStartInstant(record.date).getTime();
  if (nowMs < start) return record; // not 2 PM yet
  if (!record.currentStart || new Date(record.currentStart).getTime() >= start) return record; // started work after 2 PM

  record.workedMs += Math.max(0, start - new Date(record.currentStart).getTime());
  record.currentStart = null;
  record.state = "on_lunch";
  record.breaks.push({ type: "lunch", start: new Date(start) });
  await record.save();
  return record;
};

// Pause every open full-day timer at 2 PM. Run by the 2 PM cron.
export const lunchStopAll = async (nowMs = Date.now()) => {
  const date = ymd(nowMs);
  const records = await Attendance.find({ date, dayType: "full", state: "working" });
  let paused = 0;
  for (const r of records) {
    await applyLunchStop(r, nowMs);
    if (r.state === "on_lunch") paused++;
  }
  return paused;
};

// self-check: node services/attendanceLunch.js  (uses a fake record, no DB)
if (import.meta.url === `file://${process.argv[1]}`) {
  const HOUR = 3600000;
  const at = (utc) => new Date(`2026-07-15T${utc}Z`).getTime();
  const mk = (o = {}) => ({ dayType: "full", state: "working", workedMs: 0, breaks: [], date: "2026-07-15", save: async () => {}, ...o });
  const ok = (c, m) => console.assert(c, m);

  // checked in 11:30 IST (06:00 UTC); at 2 PM → banks 2.5h, goes on_lunch
  let r = mk({ currentStart: new Date(at("06:00:00")) });
  await applyLunchStop(r, at("08:30:00"));
  ok(r.state === "on_lunch" && Math.round(r.workedMs / HOUR * 10) === 25, `banked 2.5h at lunch, got ${r.workedMs / HOUR}`);
  ok(r.breaks.some((b) => b.type === "lunch"), "lunch break pushed");

  // before 2 PM → untouched
  r = mk({ currentStart: new Date(at("06:00:00")) });
  await applyLunchStop(r, at("08:00:00"));
  ok(r.state === "working", "before 2 PM stays working");

  // started work at 2:30 PM (after lunch window opened) → not auto-paused
  r = mk({ currentStart: new Date(at("09:00:00")) });
  await applyLunchStop(r, at("09:15:00"));
  ok(r.state === "working", "started after 2 PM not paused");

  // already took lunch → not paused again
  r = mk({ currentStart: new Date(at("06:00:00")), breaks: [{ type: "lunch" }] });
  await applyLunchStop(r, at("08:30:00"));
  ok(r.state === "working", "already lunched not re-paused");

  // half day → never auto-lunch
  r = mk({ dayType: "half", currentStart: new Date(at("06:00:00")) });
  await applyLunchStop(r, at("08:30:00"));
  ok(r.state === "working", "half day no lunch");

  // resume gate: lunch ends 15:00 IST == 09:30 UTC
  ok(at("09:00:00") < lunchEndInstant("2026-07-15").getTime(), "before 3 PM locked");
  ok(at("09:45:00") > lunchEndInstant("2026-07-15").getTime(), "after 3 PM open");
  console.log("attendanceLunch self-check done");
}

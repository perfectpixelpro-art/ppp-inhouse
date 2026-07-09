import Attendance from "../models/Attendance.js";

const OPEN = ["working", "on_lunch", "on_break"];

// The shift hard cap is 8:30 PM IST. IST is UTC+5:30, so 20:30 IST == 15:00 UTC
// on the same calendar day (the `date` field is a UTC YYYY-MM-DD key).
export const hardStopInstant = (date) => new Date(`${date}T15:00:00.000Z`);

const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);

// Force-close a single FULL-day record once 8:30 PM has passed.
// Worked time is banked up to (but not beyond) 8:30 PM; only the DSR remains.
// `nowMs` is injectable so the behaviour is deterministic in tests.
export const applyHardStop = async (record, nowMs = Date.now()) => {
  if (!record || record.dayType !== "full" || !OPEN.includes(record.state)) return record;

  const stop = hardStopInstant(record.date).getTime();
  if (nowMs < stop) return record; // 8:30 PM hasn't arrived yet

  if (record.state === "working" && record.currentStart) {
    record.workedMs += Math.max(0, stop - new Date(record.currentStart).getTime());
  }
  record.currentStart = null;
  record.state = "ended";
  record.checkOut = new Date(stop);
  record.autoClosed = true;
  record.note = "Auto-closed at 8:30 PM (shift cap)";
  await record.save();
  return record;
};

// Close every open full-day record for the current day. Run by the 8:30 PM cron.
export const hardStopAll = async (nowMs = Date.now()) => {
  const date = ymd(nowMs);
  const records = await Attendance.find({ date, dayType: "full", state: { $in: OPEN } });
  let closed = 0;
  for (const r of records) {
    await applyHardStop(r, nowMs);
    if (r.state === "ended") closed++;
  }
  return closed;
};

import Attendance from "../models/Attendance.js";

export const OPEN = ["working", "on_lunch", "on_break"];

// The shift cap defaults to 8:30 PM IST but is per-employee (User.shiftCapIST).
// IST is UTC+5:30 and `date` is a UTC YYYY-MM-DD key, so a "HH:MM" IST cap maps to
// (H*60 + M − 330) minutes past 00:00 UTC on the same day.
export const hardStopInstant = (date, capIST = "20:30") => {
  const [h, m] = capIST.split(":").map(Number);
  return new Date(`${date}T00:00:00.000Z`).getTime() + (h * 60 + m - 330) * 60000;
};

const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);

// Force-close a single FULL-day record once its shift cap has passed.
// Worked time is banked up to (but not beyond) the cap; only the DSR remains.
// `nowMs` is injectable so the behaviour is deterministic in tests.
export const applyHardStop = async (record, capIST = "20:30", nowMs = Date.now()) => {
  if (!record || record.dayType !== "full" || !OPEN.includes(record.state)) return record;

  const stop = hardStopInstant(record.date, capIST);
  if (nowMs < stop) return record; // cap hasn't arrived yet

  if (record.state === "working" && record.currentStart) {
    record.workedMs += Math.max(0, stop - new Date(record.currentStart).getTime());
  }
  const capLabel = new Date(stop).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  record.currentStart = null;
  record.state = "ended";
  record.checkOut = new Date(stop);
  record.autoClosed = true;
  record.note = `Auto-closed at ${capLabel} (shift cap)`;
  await record.save();
  return record;
};

// Close every open full-day record whose per-employee cap has passed.
export const hardStopAll = async (nowMs = Date.now()) => {
  const date = ymd(nowMs);
  const records = await Attendance.find({ date, dayType: "full", state: { $in: OPEN } })
    .populate("employee", "shiftCapIST");
  let closed = 0;
  for (const r of records) {
    await applyHardStop(r, r.employee?.shiftCapIST || "20:30", nowMs);
    if (r.state === "ended") closed++;
  }
  return closed;
};

// self-check: node services/attendanceHardStop.js
if (import.meta.url === `file://${process.argv[1]}`) {
  const iso = (ms) => new Date(ms).toISOString();
  const ok = (c, m) => console.assert(c, m);
  // 8:30 PM IST == 15:00:00 UTC same day
  ok(iso(hardStopInstant("2026-07-15")) === "2026-07-15T15:00:00.000Z", "default cap 20:30 → 15:00Z");
  // 9:00 PM IST == 15:30:00 UTC
  ok(iso(hardStopInstant("2026-07-15", "21:00")) === "2026-07-15T15:30:00.000Z", "cap 21:00 → 15:30Z");
  // banks worked time up to the cap, not beyond
  (async () => {
    const HOUR = 3600000;
    const at = (u) => new Date(`2026-07-15T${u}Z`).getTime();
    const r = { dayType: "full", state: "working", workedMs: 0, currentStart: new Date(at("09:30:00")), date: "2026-07-15", save: async () => {} };
    await applyHardStop(r, "21:00", at("16:00:00")); // now past 9 PM cap; worked since 3 PM IST
    ok(r.state === "ended" && Math.round(r.workedMs / HOUR) === 6, `banked to 9 PM cap, got ${r.workedMs / HOUR}h`);
    console.log("attendanceHardStop self-check done");
  })();
}

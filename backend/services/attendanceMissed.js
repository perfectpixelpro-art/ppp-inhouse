import Attendance from "../models/Attendance.js";
import Holiday from "../models/Holiday.js";
import Leave from "../models/Leave.js";

// How far back we ask the employee to account for missed days.
const LOOKBACK_DAYS = 21;

const ymd = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

// Off days mirror payroll.js / scheduler.js: Sunday, even (2nd/4th) Saturday, national holiday.
const isOffDay = (d, holidaySet) => {
  const dow = d.getDay();
  if (dow === 0) return true;
  if (dow === 6 && Math.ceil(d.getDate() / 7) % 2 === 0) return true;
  return holidaySet.has(ymd(d));
};

// A record already accounts for the day if the person checked in, the day is
// classified (leave/wfh/half-day/absent), or they self-reported it.
const isAccounted = (rec) => {
  if (!rec) return false;
  if (rec.checkIn) return true;
  if (rec.selfReportedAt) return true;
  if (["leave", "wfh", "half-day", "absent"].includes(rec.status)) return true;
  return false;
};

// Working days in the recent past (before today) that the employee never accounted
// for — no check-in, no leave, not a holiday/off day. These trigger the popup.
export const findMissedDays = async (employeeId, todayMs = Date.now()) => {
  const today = new Date(todayMs);
  const todayStr = ymd(today);

  const start = new Date(today);
  start.setDate(start.getDate() - LOOKBACK_DAYS);
  start.setHours(0, 0, 0, 0);

  // Holidays in range → set of YYYY-MM-DD
  const hols = await Holiday.find({ type: "national", date: { $gte: start, $lte: today } }).select("date");
  const holidaySet = new Set(hols.map((h) => ymd(h.date)));

  // Existing attendance records in range, keyed by date.
  const recs = await Attendance.find({ employee: employeeId, date: { $gte: ymd(start), $lte: todayStr } });
  const byDate = new Map(recs.map((r) => [r.date, r]));

  // Approved leaves overlapping the range → set of covered YYYY-MM-DD.
  const leaves = await Leave.find({
    employee: employeeId,
    status: "approved",
    fromDate: { $lte: today },
    toDate: { $gte: start },
  }).select("fromDate toDate");
  const onLeave = (dateStr) =>
    leaves.some((l) => dateStr >= ymd(l.fromDate) && dateStr <= ymd(l.toDate));

  const missed = [];
  for (let i = LOOKBACK_DAYS; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = ymd(d);
    if (isOffDay(d, holidaySet)) continue;
    if (onLeave(dateStr)) continue;
    if (isAccounted(byDate.get(dateStr))) continue;
    missed.push(dateStr);
  }
  return missed;
};

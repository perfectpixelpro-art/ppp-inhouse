// Recompute worked time when HR corrects a day's punch times.
// workedMs = (out − in) − completed breaks. An un-taken lunch hour is NOT
// subtracted here — payroll (overtimeMs) already deducts it.
export const breaksMsOf = (breaks = []) =>
  breaks.reduce((s, b) => s + (b.start && b.end ? new Date(b.end) - new Date(b.start) : 0), 0);

export const recomputeWorkedMs = (checkIn, checkOut, breaks = []) =>
  Math.max(0, new Date(checkOut) - new Date(checkIn) - breaksMsOf(breaks));

// self-check: node services/attendanceEdit.js
if (typeof process !== "undefined" && process.argv?.[1] && import.meta.url === `file://${process.argv[1]}`) {
  const H = 3600000;
  const eq = (a, b, m) => console.assert(a === b, `${m}: got ${a} exp ${b}`);
  const d = (t) => new Date(`2026-07-10T${t}:00+05:30`);
  // 10:45 → 19:34, no breaks → 8h49m
  eq(recomputeWorkedMs(d("10:45"), d("19:34")), 8 * H + 49 * 60000, "presence, no breaks");
  // same day with a 1h lunch break → 7h49m
  eq(recomputeWorkedMs(d("10:45"), d("19:34"), [{ type: "lunch", start: d("14:00"), end: d("15:00") }]),
     7 * H + 49 * 60000, "presence minus 1h lunch");
  // open break (no end) is ignored
  eq(recomputeWorkedMs(d("10:00"), d("18:00"), [{ type: "break", start: d("13:00") }]), 8 * H, "open break ignored");
  // out before in → 0, never negative
  eq(recomputeWorkedMs(d("18:00"), d("10:00")), 0, "negative clamps to 0");
  console.log("attendanceEdit self-check done");
}

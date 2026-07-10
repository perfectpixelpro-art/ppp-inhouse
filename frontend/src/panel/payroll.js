// Monthly working-hours + shortfall deduction.
// Working day = Mon–Fri, or an ODD-numbered Saturday (1st/3rd/5th). Off = Sunday,
// EVEN Saturday (2nd/4th), and national holidays.
// Base = workingDays × 8h. If worked < base → ₹200 per short hour (prorated).
const HOUR = 3600000;
const pad = (n) => String(n).padStart(2, "0");
export const SHORT_RATE = 200; // ₹ per short hour

export function workingDaysInMonth(year, month0, holidaySet = new Set()) {
  let count = 0, satOrdinal = 0;
  const days = new Date(year, month0 + 1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month0, d).getDay();
    if (dow === 6) satOrdinal++;                 // count every Saturday for odd/even
    const ymd = `${year}-${pad(month0 + 1)}-${pad(d)}`;
    if (holidaySet.has(ymd)) continue;            // national holiday
    if (dow === 0) continue;                      // Sunday
    if (dow === 6 && satOrdinal % 2 === 0) continue; // even Saturday
    count++;
  }
  return count;
}

// records: this employee's attendance for the month. Returns hours + money.
// Rain days are flagged for HR's information but count like any other working day.
export function monthlySummary(year, month0, records, holidaySet = new Set()) {
  const workingDays = workingDaysInMonth(year, month0, holidaySet);
  const baseMs = workingDays * 8 * HOUR;
  const workedMs = records.reduce((s, r) => s + (r.workedMs || 0), 0);
  const diffMs = workedMs - baseMs; // + overtime, − short
  const shortHours = diffMs < 0 ? -diffMs / HOUR : 0;
  const deduction = Math.round(shortHours * SHORT_RATE);
  return { workingDays, baseMs, workedMs, diffMs, shortHours, deduction, rainDays: records.filter((r) => r.rain).length };
}

// Net overtime (+) or shortfall (−) across finished days, in ms.
// Rain days count like any other day; only unfinished days are left out.
export const targetMsFor = (r) => (r.dayType === "half" ? 4 : 8) * HOUR;
export function netBalanceMs(records = []) {
  return records
    .filter((r) => r.state === "ended")
    .reduce((sum, r) => sum + ((r.workedMs || 0) - targetMsFor(r)), 0);
}

// self-check: node src/panel/payroll.js
if (typeof process !== "undefined" && process.argv?.[1] && import.meta.url === `file://${process.argv[1]}`) {
  const eq = (a, b, m) => console.assert(a === b, `${m}: got ${a} exp ${b}`);
  // July 2026: 31 days. Sundays: 5,12,19,26 (4). Saturdays: 4,11,18,25 → ord 1,2,3,4;
  // even Saturdays off: 11,18? no — 2nd=11,4th=25 off; 1st=4,3rd=18 work.
  // holidays: none in July here.
  const wd = workingDaysInMonth(2026, 6, new Set());
  // Total days 31 − 4 Sundays − 2 even-Saturdays(11,25) = 25 working days
  eq(wd, 25, "July 2026 working days");
  // one holiday on Wed 2026-07-08 → 24
  eq(workingDaysInMonth(2026, 6, new Set(["2026-07-08"])), 24, "with 1 holiday");
  // deduction: base 25*8=200h; worked 190h → short 10h → ₹2000
  const s = monthlySummary(2026, 6, [{ workedMs: 190 * HOUR }], new Set());
  eq(s.deduction, 2000, "short 10h deduction");
  const s2 = monthlySummary(2026, 6, [{ workedMs: 210 * HOUR }], new Set());
  eq(s2.deduction, 0, "overtime no deduction");
  // a rain day does NOT change the base: still 25 working days (200h); worked 190h → ₹2000
  const s3 = monthlySummary(2026, 6, [{ workedMs: 190 * HOUR, rain: true, date: "2026-07-06" }], new Set());
  eq(s3.deduction, 2000, "rain day counts like a normal day");
  // net balance: +1h, −2h, rain day −8h all count; unfinished day ignored → net −9h
  const recs = [
    { state: "ended", workedMs: 9 * HOUR },
    { state: "ended", workedMs: 6 * HOUR },
    { state: "ended", workedMs: 0, rain: true },
    { state: "working", workedMs: 3 * HOUR },
  ];
  eq(netBalanceMs(recs), -9 * HOUR, "net balance counts rain, skips unfinished days");
  console.log("payroll self-check done");
}

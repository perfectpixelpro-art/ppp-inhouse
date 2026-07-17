// How much a leave costs, and whether it hits salary (money) or the leave balance.
// Rules (from spec):
//  - single-day Fri or Mon leave bridges Sat+Sun → 3 days, always salary
//  - else per-day penalty by notice (fromDate − appliedAt): >=7d → 1 · 3–6d → 1.5
//    (1 if docs attached) · <3d → 2, then multiplied by the number of leave days
//  - type: during probation → salary (no paid leave); otherwise → leave balance.
//    Non-probation staff get 1.5 paid days on leaving probation and 1.5 more each
//    month after (see accruedLeaveDays); penalty beyond the accrued balance spills
//    to salary — that spill is computed in the balance aggregate (getLeaveBalance),
//    not here.
export const MONTHLY_ACCRUAL = 1.5;
const DAY = 86400000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
const sameDay = (a, b) => startOfDay(a) === startOfDay(b);
const dayCount = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / DAY) + 1;

export function computeLeaveDeduction(leave, employee) {
  const from = leave.fromDate;
  const appliedAt = leave.createdAt || new Date();
  const notice = Math.floor((startOfDay(from) - startOfDay(appliedAt)) / DAY);
  const dow = new Date(from).getDay(); // 0 Sun … 5 Fri, 6 Sat
  const single = sameDay(from, leave.toDate);
  const count = Math.max(1, dayCount(from, leave.toDate));
  const hasDocs = !!leave.attachment;
  const inProbation =
    employee?.probationStart && employee?.probationEnd &&
    startOfDay(from) >= startOfDay(employee.probationStart) &&
    startOfDay(from) <= startOfDay(employee.probationEnd);

  if (single && (dow === 5 || dow === 1)) {
    return { days: 3, type: "salary", reason: dow === 5 ? "Fri + weekend bridge" : "weekend + Mon bridge" };
  }

  let perDay;
  let tier;
  if (notice >= 7) { perDay = 1; tier = "7+ days notice"; }
  else if (notice >= 3) { perDay = hasDocs ? 1 : 1.5; tier = hasDocs ? "3–6 days + docs" : "3–6 days notice"; }
  else { perDay = 2; tier = "short/immediate notice"; }

  const days = perDay * count;
  const label = count > 1 ? `${tier} ×${count}d` : tier;
  return { days, type: inProbation ? "salary" : "leave", reason: `${label}${inProbation ? " (probation)" : ""}` };
}

// Paid leave a non-probation employee has accrued. The first 1.5 days are granted
// up front the moment probation ends (or on joining, if there's no probation), and
// another 1.5 lands on each monthly anniversary of that date. Zero while still in
// probation. So probation ending 30 Jun → 1.5 from 30 Jun, 3 from 30 Jul, and so on.
export function accruedLeaveDays(employee, asOf = new Date()) {
  const start = employee?.probationEnd || employee?.joinDate;
  if (!start) return 0;
  const s = new Date(start);
  if (s > asOf) return 0; // probation hasn't ended yet
  const months =
    (asOf.getFullYear() - s.getFullYear()) * 12 +
    (asOf.getMonth() - s.getMonth()) -
    (asOf.getDate() < s.getDate() ? 1 : 0);
  return (Math.max(0, months) + 1) * MONTHLY_ACCRUAL;
}

// self-check: node services/leaveDeduction.js
if (import.meta.url === `file://${process.argv[1]}`) {
  const d = (s) => new Date(s + "T00:00:00");
  const mk = (from, to, applied, extra = {}) => ({ fromDate: d(from), toDate: d(to || from), createdAt: d(applied), ...extra });
  const emp = (p) => (p ? { probationStart: d("2026-07-01"), probationEnd: d("2026-07-31") } : {});
  const eq = (got, exp, msg) => { console.assert(got.days === exp.days && got.type === exp.type, `${msg}: got ${JSON.stringify(got)} exp ${JSON.stringify(exp)}`); };

  // 2026-07-06 is Monday, 07-10 Friday, 07-08 Wednesday
  eq(computeLeaveDeduction(mk("2026-07-22", "2026-07-22", "2026-07-08"), emp(false)), { days: 1, type: "leave" }, "14d notice, no probation (Wed)");
  eq(computeLeaveDeduction(mk("2026-07-22", "2026-07-22", "2026-07-08"), emp(true)), { days: 1, type: "salary" }, "14d notice, probation (Wed)");
  eq(computeLeaveDeduction(mk("2026-07-08", "2026-07-08", "2026-07-04"), emp(false)), { days: 1.5, type: "leave" }, "4d notice no docs (Wed)");
  eq(computeLeaveDeduction(mk("2026-07-08", "2026-07-08", "2026-07-04", { attachment: "x.png" }), emp(false)), { days: 1, type: "leave" }, "4d notice + docs");
  eq(computeLeaveDeduction(mk("2026-07-08", "2026-07-08", "2026-07-08"), emp(false)), { days: 2, type: "leave" }, "same-day (Wed)");
  eq(computeLeaveDeduction(mk("2026-07-10", "2026-07-10", "2026-07-01"), emp(false)), { days: 3, type: "salary" }, "Friday bridge");
  eq(computeLeaveDeduction(mk("2026-07-06", "2026-07-06", "2026-07-01"), emp(false)), { days: 3, type: "salary" }, "Monday bridge");
  // multi-day: penalty is per-day × number of days (07-22 Wed → 07-24 Fri = 3 days)
  eq(computeLeaveDeduction(mk("2026-07-22", "2026-07-24", "2026-07-08"), emp(false)), { days: 3, type: "leave" }, "3-day leave, 14d notice");
  eq(computeLeaveDeduction(mk("2026-07-22", "2026-07-23", "2026-07-21"), emp(false)), { days: 4, type: "leave" }, "2-day leave, short notice ×2");

  // accrual: 1.5 granted at probation exit, +1.5 each monthly anniversary after.
  const acc = (e, on, exp, msg) => console.assert(accruedLeaveDays(e, d(on)) === exp, `${msg}: got ${accruedLeaveDays(e, d(on))} exp ${exp}`);
  acc({ probationEnd: d("2026-01-15") }, "2026-07-15", 10.5, "6 months on → 1.5 + 6×1.5");
  acc({ probationEnd: d("2026-07-31") }, "2026-07-15", 0, "still in probation → 0");
  acc({ joinDate: d("2026-04-10") }, "2026-07-15", 6, "no probation, 3 months → 1.5 + 3×1.5");
  acc({}, "2026-07-15", 0, "no dates at all → 0");
  // the case that was showing 0 in the Leaves Remaining tab: probation just ended
  acc({ probationEnd: d("2026-06-30") }, "2026-07-17", 1.5, "probation ended 17d ago → 1.5");
  acc({ probationEnd: d("2026-07-16") }, "2026-07-17", 1.5, "probation ended yesterday → 1.5");
  acc({ probationEnd: d("2026-07-17") }, "2026-07-17", 1.5, "probation ends today → 1.5 same day");
  acc({ probationEnd: d("2026-06-15") }, "2026-07-17", 3, "one anniversary passed → 3");
  console.log("leaveDeduction self-check done");
}

// How much a leave costs, and whether it hits salary (money) or the leave balance.
// Rules (from spec):
//  - single-day Fri or Mon leave bridges Sat+Sun → 3 days, always salary
//  - else per-day penalty by notice (fromDate − appliedAt): >=7d → 1 · 3–6d → 1.5
//    (1 if docs attached) · <3d → 2, then multiplied by the number of leave days
//  - type: during probation → salary (no paid leave); otherwise → leave balance.
//    Non-probation staff accrue 1.5 paid days per month (see accruedLeaveDays);
//    penalty beyond the accrued balance spills to salary — that spill is computed
//    in the balance aggregate (getLeaveBalance), not here.
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

// Paid leave a non-probation employee has accrued: 1.5 days per whole month since
// probation ended (or since joining, if no probation). Zero while in probation.
export function accruedLeaveDays(employee, asOf = new Date()) {
  const start = employee?.probationEnd || employee?.joinDate;
  if (!start) return 0;
  const s = new Date(start);
  if (s > asOf) return 0;
  const months =
    (asOf.getFullYear() - s.getFullYear()) * 12 +
    (asOf.getMonth() - s.getMonth()) -
    (asOf.getDate() < s.getDate() ? 1 : 0);
  return Math.max(0, months) * MONTHLY_ACCRUAL;
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

  // accrual: 1.5 per whole month since probation end (probation itself accrues 0)
  console.assert(accruedLeaveDays({ probationEnd: d("2026-01-15") }, d("2026-07-15")) === 9, "6 months → 9 days");
  console.assert(accruedLeaveDays({ probationEnd: d("2026-07-31") }, d("2026-07-15")) === 0, "still in probation → 0");
  console.assert(accruedLeaveDays({ joinDate: d("2026-04-10") }, d("2026-07-15")) === 4.5, "no probation, 3 months → 4.5");
  console.log("leaveDeduction self-check done");
}

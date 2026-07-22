// Credit worked time to a specific day, reducing that day's "short" figure.
//
//   node scripts/adjustShortTime.js            # dry run — prints, changes nothing
//   node scripts/adjustShortTime.js --apply    # actually writes
//
// RUN THIS ON THE LIVE SERVER — it uses MONGO_URI from that machine's .env.
//
// Short time = target (8h full / 4h half) − chargeable, where chargeable is
// workedMs minus an un-taken lunch hour (see frontend/src/panel/payroll.js).
// Crediting X minutes of work therefore reduces short time by exactly X.
//
// Safety: each row states the short time you EXPECT to find. If the live record
// disagrees, that row is refused — so a stale or misread figure can't quietly
// write the wrong number into payroll. Re-running is safe: a record already
// carrying the same correction note is skipped rather than double-credited.
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

dotenv.config();

const HOUR = 3600000;
const mins = (h, m = 0) => h * 60 + m;

// --- edit this table, then run with --apply ------------------------------
// expectShortBefore / expectShortAfter are in MINUTES and are both verified.
const ADJUSTMENTS = [
  {
    name: "Nikhil Sharma",
    date: "2026-07-21",
    addMinutes: mins(1, 32),
    expectShortBefore: mins(1, 55),
    expectShortAfter: mins(0, 23),
  },
  {
    name: "Yash Parcha",
    date: "2026-07-21",
    addMinutes: mins(1, 32),
    expectShortBefore: mins(1, 44),
    // NOTE: 1h44m − 1h32m = 12m, but 14m was requested. This row will be REFUSED
    // until the numbers agree. Fix whichever is wrong:
    //   short is really 1h46m  → set expectShortBefore: mins(1, 46)
    //   add only 1h30m         → set addMinutes: mins(1, 30)
    expectShortAfter: mins(0, 14),
  },
  {
    name: "Saquib Khan",
    date: "2026-07-22",
    addMinutes: mins(0, 30),
    expectShortBefore: mins(1, 0),
    expectShortAfter: mins(0, 30),
  },
];
// ------------------------------------------------------------------------

const APPLY = process.argv.includes("--apply");
const fmt = (ms) => {
  const sign = ms < 0 ? "-" : "";
  const m = Math.round(Math.abs(ms) / 60000);
  return `${sign}${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};
const tookLunch = (r) => (r.breaks || []).some((b) => b.type === "lunch");
const lunchDeductMs = (r) => (r.dayType !== "half" && !tookLunch(r) ? HOUR : 0);
const chargeableMs = (r) => Math.max(0, (r.workedMs || 0) - lunchDeductMs(r));
const targetMs = (r) => (r.dayType === "half" ? 4 : 8) * HOUR;
const overtimeMs = (r) => chargeableMs(r) - targetMs(r); // negative = short
const shortMins = (r) => Math.round(-overtimeMs(r) / 60000); // positive = short
const label = (r) => (overtimeMs(r) < 0 ? `SHORT ${fmt(-overtimeMs(r))}` : `OT ${fmt(overtimeMs(r))}`);

// Arithmetic sanity, independent of the database.
const preflight = () => {
  let bad = 0;
  for (const a of ADJUSTMENTS) {
    const implied = a.expectShortBefore - a.addMinutes;
    if (implied !== a.expectShortAfter) {
      console.log(`✗ ${a.name}: ${a.expectShortBefore}m − ${a.addMinutes}m = ${implied}m, but ${a.expectShortAfter}m was requested. Fix the table.`);
      bad++;
    }
  }
  return bad;
};

const run = async () => {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN (pass --apply to write)"}\n`);

  console.log("--- arithmetic preflight ---");
  const bad = preflight();
  console.log(bad ? `${bad} row(s) with inconsistent numbers — those will be refused.\n` : "all rows consistent\n");

  await connectDB();
  console.log(`connected: ${mongoose.connection.host}/${mongoose.connection.name}\n`);

  let changed = 0, refused = 0;
  for (const a of ADJUSTMENTS) {
    const { name, date, addMinutes, expectShortBefore, expectShortAfter } = a;
    const tag = `${String(name).padEnd(15)} ${date}`;

    if (expectShortBefore - addMinutes !== expectShortAfter) {
      console.log(`✗ ${tag} — REFUSED: inconsistent numbers (see preflight)`);
      refused++; continue;
    }

    const user = await User.findOne({ name });
    if (!user) { console.log(`✗ ${tag} — REFUSED: no such user`); refused++; continue; }

    const rec = await Attendance.findOne({ employee: user._id, date });
    if (!rec) { console.log(`✗ ${tag} — REFUSED: no attendance record for that date`); refused++; continue; }

    const note = `HR correction: +${addMinutes}m worked`;
    if (rec.note === note) { console.log(`• ${tag} — already corrected, skipped (no double-credit)`); continue; }

    if (rec.state !== "ended") {
      console.log(`✗ ${tag} — REFUSED: state is "${rec.state}", not ended. A live timer would overwrite workedMs — end the day first.`);
      refused++; continue;
    }

    const actualBefore = shortMins(rec);
    if (actualBefore !== expectShortBefore) {
      console.log(`✗ ${tag} — REFUSED: expected short ${fmt(expectShortBefore * 60000)}, live record is ${label(rec)}`);
      refused++; continue;
    }

    const before = label(rec);
    rec.workedMs = Math.max(0, (rec.workedMs || 0) + addMinutes * 60000);

    if (shortMins(rec) !== expectShortAfter) {
      console.log(`✗ ${tag} — REFUSED: result would be ${label(rec)}, expected short ${fmt(expectShortAfter * 60000)}`);
      refused++; continue; // not saved — the in-memory doc is discarded
    }

    console.log(`✓ ${tag}  ${before} → ${label(rec)}`);
    if (APPLY) {
      rec.note = note;
      rec.editedAt = new Date();
      await rec.save();
      changed++;
    }
  }

  console.log(`\n${APPLY ? `${changed} updated` : `${ADJUSTMENTS.length - refused} would update`}, ${refused} refused.`);
  console.log(APPLY ? "" : "Nothing written — re-run with --apply.\n");
  await mongoose.connection.close();
  process.exit(refused ? 1 : 0);
};

run().catch((err) => { console.error(err); process.exit(1); });

// Delete specific attendance records (e.g. a stray "not started" day).
//
//   node scripts/deleteAttendance.js            # dry run — prints, deletes nothing
//   node scripts/deleteAttendance.js --apply    # actually deletes
//
// RUN THIS ON THE LIVE SERVER — it uses MONGO_URI from that machine's .env.
//
// Safety: each row states the state you EXPECT to find. If the live record
// disagrees (e.g. the day is actually "ended" with real worked time), that row
// is REFUSED so you can't accidentally wipe a real day's work. A missing record
// is treated as already-done, not an error.
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

dotenv.config();

// --- edit this table, then run with --apply ------------------------------
const DELETIONS = [
  {
    name: "Saquib Khan",
    date: "2026-07-31",
    expectState: "not_started", // refuse if the live record is anything else
  },
];
// ------------------------------------------------------------------------

const APPLY = process.argv.includes("--apply");

const run = async () => {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN (pass --apply to delete)"}\n`);

  await connectDB();
  console.log(`connected: ${mongoose.connection.host}/${mongoose.connection.name}\n`);

  let deleted = 0, refused = 0;
  for (const d of DELETIONS) {
    const { name, date, expectState } = d;
    const tag = `${String(name).padEnd(15)} ${date}`;

    const user = await User.findOne({ name });
    if (!user) { console.log(`✗ ${tag} — REFUSED: no such user`); refused++; continue; }

    const rec = await Attendance.findOne({ employee: user._id, date });
    if (!rec) { console.log(`• ${tag} — no record found, nothing to delete`); continue; }

    if (expectState && rec.state !== expectState) {
      console.log(`✗ ${tag} — REFUSED: expected state "${expectState}", live record is "${rec.state}" (workedMs=${rec.workedMs || 0}). Not deleting.`);
      refused++; continue;
    }

    console.log(`✓ ${tag} — will delete (state="${rec.state}", in=${rec.checkIn || "—"}, out=${rec.checkOut || "—"})`);
    if (APPLY) {
      await Attendance.deleteOne({ _id: rec._id });
      deleted++;
    }
  }

  console.log(`\n${APPLY ? `${deleted} deleted` : `${DELETIONS.length - refused} would delete`}, ${refused} refused.`);
  console.log(APPLY ? "" : "Nothing deleted — re-run with --apply.\n");
  await mongoose.connection.close();
  process.exit(refused ? 1 : 0);
};

run().catch((err) => { console.error(err); process.exit(1); });

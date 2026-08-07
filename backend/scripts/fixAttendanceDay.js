// Correct a single attendance day: set exact in/out times, day type, and clear
// breaks (worked = out − in). Use for a mis-recorded day.
//
//   node scripts/fixAttendanceDay.js            # dry run — prints, changes nothing
//   node scripts/fixAttendanceDay.js --apply    # actually writes
//
// RUN THIS ON THE LIVE SERVER — it uses MONGO_URI from that machine's .env.
//
// Current target: Saquib Khan, 2026-08-06 → 11:47 AM to 3:29 PM IST, half day,
// no lunch break (worked 3h 42m; against a 4h half-day that is 18m short).
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

dotenv.config();

// --- edit this, then run with --apply -----------------------------------
const FIX = {
  name: "Saquib Khan",
  date: "2026-08-06",
  inIST: "11:47",   // HH:MM (24h) IST
  outIST: "15:29",  // 3:29 PM
  dayType: "half",  // "full" | "half"
  clearBreaks: true, // no lunch/break — worked is the full in→out span
};
// ------------------------------------------------------------------------

const APPLY = process.argv.includes("--apply");
const istInstant = (date, hm) => new Date(`${date}T${hm}:00+05:30`);
const fmt = (ms) => `${Math.floor(ms / 3600000)}h ${String(Math.round((ms % 3600000) / 60000)).padStart(2, "0")}m`;

const run = async () => {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN (pass --apply to write)"}\n`);
  await connectDB();
  console.log(`connected: ${mongoose.connection.host}/${mongoose.connection.name}\n`);

  const user = await User.findOne({ name: FIX.name });
  if (!user) { console.log(`✗ no user "${FIX.name}"`); process.exit(1); }

  const rec = await Attendance.findOne({ employee: user._id, date: FIX.date });
  if (!rec) { console.log(`✗ no attendance for ${FIX.name} on ${FIX.date}`); process.exit(1); }

  const checkIn = istInstant(FIX.date, FIX.inIST);
  const checkOut = istInstant(FIX.date, FIX.outIST);
  if (checkOut <= checkIn) { console.log("✗ out must be after in"); process.exit(1); }

  const breaksMs = FIX.clearBreaks ? 0 : (rec.breaks || []).reduce((s, b) => s + (b.end ? new Date(b.end) - new Date(b.start) : 0), 0);
  const workedMs = (checkOut - checkIn) - breaksMs;

  console.log(`Before: in=${rec.checkIn} out=${rec.checkOut} dayType=${rec.dayType} worked=${fmt(rec.workedMs || 0)} breaks=${(rec.breaks || []).length}`);
  console.log(`After : in=${checkIn.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} out=${checkOut.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} dayType=${FIX.dayType} worked=${fmt(workedMs)}`);
  const target = (FIX.dayType === "half" ? 4 : 8) * 3600000;
  const diff = workedMs - target;
  console.log(`Result: ${diff >= 0 ? "overtime" : "short"} ${fmt(Math.abs(diff))} (vs ${FIX.dayType} ${target / 3600000}h target)\n`);

  if (APPLY) {
    rec.checkIn = checkIn;
    rec.checkOut = checkOut;
    rec.dayType = FIX.dayType;
    if (FIX.clearBreaks) rec.breaks = [];
    rec.workedMs = workedMs;
    rec.state = "ended";
    rec.currentStart = null;
    rec.status = "present";
    rec.needsReview = false;
    rec.editedAt = new Date();
    await rec.save();
    console.log("✓ saved.");
  } else {
    console.log("Nothing written — re-run with --apply.");
  }
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => { console.error(err); process.exit(1); });

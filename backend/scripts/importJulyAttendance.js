// One-off import of the HR Attendance Tracker (July 2026) spreadsheet.
//   node scripts/importJulyAttendance.js
// Creates any missing employees, then upserts one attendance record per row so
// Worked / Overtime / Short / DSR all render. Safe to re-run (upsert by date).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, "july-attendance.json"), "utf8"));

const TEMP_PASSWORD = "ppp@2026";
// Whole-office rain days — everyone is exempt from overtime/short on these.
const RAIN_DATES = new Set(["2026-07-01"]);
const emailFor = (name) => `${name.trim().split(/\s+/)[0].toLowerCase()}@perfectpixelpro.com`;

// "8:14 PM" -> { h: 20, m: 14 }
const parseClock = (s) => {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((s || "").trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return { h, m: Number(m[2]) };
};

// Times in the sheet are IST — anchor them to +05:30 so they display correctly.
const istDate = (ymd, clock) =>
  clock ? new Date(`${ymd}T${String(clock.h).padStart(2, "0")}:${String(clock.m).padStart(2, "0")}:00+05:30`) : null;

// "08:14" -> ms
const hoursToMs = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec((s || "").trim());
  return m ? (Number(m[1]) * 60 + Number(m[2])) * 60000 : null;
};

const run = async () => {
  await connectDB();

  // 1. Ensure every employee exists. Match on email first — it's the unique key,
  // and an existing account may be stored under a slightly different name.
  const names = [...new Set(rows.map((r) => r.name))].sort();
  const userByName = {};
  for (const name of names) {
    const email = emailFor(name);
    let user = await User.findOne({ $or: [{ email }, { name }] });
    if (!user) {
      user = await User.create({
        name,
        email,
        password: TEMP_PASSWORD,
        role: "employee",
        profileCompleted: false, // they complete photo/birthdate on first login
      });
      console.log(`+ created ${name} <${user.email}>`);
    } else {
      const note = user.name === name ? "" : `  (matched existing name "${user.name}")`;
      console.log(`= exists  ${name} <${user.email}>${note}`);
    }
    userByName[name] = user;
  }

  // 2. Upsert one attendance record per row
  let imported = 0;
  let skipped = 0;
  for (const r of rows) {
    const checkIn = istDate(r.date, parseClock(r.in));
    const checkOut = istDate(r.date, parseClock(r.out));
    let workedMs = hoursToMs(r.hours);
    if (workedMs == null && checkIn && checkOut) workedMs = checkOut - checkIn;
    if (workedMs == null) {
      skipped++;
      continue;
    }

    await Attendance.updateOne(
      { employee: userByName[r.name]._id, date: r.date },
      {
        $set: {
          status: "present",
          state: "ended", // finished day → Overtime/Short are computed from workedMs
          dayType: "full", // 8h target
          checkIn,
          checkOut,
          workedMs,
          dsr: r.dsr,
          rain: RAIN_DATES.has(r.date) || !!r.rain,
          currentStart: null,
        },
      },
      { upsert: true }
    );
    imported++;
  }

  console.log(`\n✓ ${imported} attendance records imported (${skipped} skipped)`);
  console.log(`✓ ${names.length} employees — temp password for new ones: ${TEMP_PASSWORD}`);
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

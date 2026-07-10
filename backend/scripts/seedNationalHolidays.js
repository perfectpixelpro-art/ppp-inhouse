// Adds the standard national holidays. Safe to re-run (upserts by name).
//   node scripts/seedNationalHolidays.js
// Republic Day & Independence Day have fixed dates; the festivals shift each year
// so they're stored name-only until imported from Google Calendar.
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Holiday from "../models/Holiday.js";

dotenv.config();

const year = new Date().getFullYear();
const on = (m, d) => new Date(Date.UTC(year, m - 1, d));

const HOLIDAYS = [
  { name: "Republic Day", date: on(1, 26) },
  { name: "Holi" },
  { name: "Independence Day", date: on(8, 15) },
  { name: "Vishwakarma Day" },
  { name: "Gandhi Jayanti" },
  { name: "Dussehra" },
  { name: "Diwali" },
];

const run = async () => {
  await connectDB();
  for (const h of HOLIDAYS) {
    await Holiday.updateOne(
      { name: h.name, type: "national" },
      { $set: { name: h.name, type: "national", ...(h.date ? { date: h.date } : {}) } },
      { upsert: true }
    );
    console.log(`✓ ${h.name}${h.date ? ` — ${h.date.toDateString()}` : " (date TBD)"}`);
  }
  await mongoose.connection.close();
  console.log(`\n${HOLIDAYS.length} national holidays ready.`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

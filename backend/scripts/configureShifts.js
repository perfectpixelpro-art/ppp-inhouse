// Set per-employee shift schedules (and Slack ids). Idempotent — safe to re-run.
//   node scripts/configureShifts.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

// name → overrides. Anyone not listed keeps the defaults (reminders 8:15/8:20/
// 8:25 PM, cap 8:30 PM).
const CONFIG = [
  {
    name: "Yash Parcha",
    slackUserId: "U0BGJA319M0",
    reminderTimesIST: ["20:45", "20:55"],
    shiftCapIST: "21:00",
  },
];

const run = async () => {
  await connectDB();
  for (const c of CONFIG) {
    const { name, ...set } = c;
    const res = await User.updateOne({ name }, { $set: set });
    console.log(res.matchedCount ? `✓ ${name}: ${JSON.stringify(set)}` : `⚠ ${name} not found`);
  }
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

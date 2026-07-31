import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Leave from "./models/Leave.js";
import Expense from "./models/Expense.js";
import Attendance from "./models/Attendance.js";
import Document from "./models/Document.js";
import Holiday from "./models/Holiday.js";
import Gallery from "./models/Gallery.js";

dotenv.config();

const run = async () => {
  // SAFETY GUARD — this script DELETES EVERY collection below and recreates only
  // the admin + HR accounts. It must only ever touch a fresh/empty database.
  // It refuses to run in production, and otherwise requires an explicit flag so
  // it can never wipe live data by accident.
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed: NODE_ENV=production. This script DELETES ALL DATA.");
    process.exit(1);
  }
  if (!process.argv.includes("--seed-fresh")) {
    console.error("Refusing to seed: this DELETES ALL DATA (users, attendance, leaves, etc.).");
    console.error("Only run on a fresh, empty database. If you are sure, re-run with:");
    console.error("  node seed.js --seed-fresh");
    process.exit(1);
  }

  await connectDB();

  // Extra guard: never wipe a database that already has real users.
  const existingUsers = await User.countDocuments();
  if (existingUsers > 2) {
    console.error(`Refusing to seed: database already has ${existingUsers} users. This looks like live data.`);
    await mongoose.connection.close();
    process.exit(1);
  }

  // Clean slate — no dummy data. Only the admin + HR accounts are created.
  await Promise.all([
    User.deleteMany({}),
    Leave.deleteMany({}),
    Expense.deleteMany({}),
    Attendance.deleteMany({}),
    Document.deleteMany({}),
    Holiday.deleteMany({}),
    Gallery.deleteMany({}),
  ]);

  const staff = [
    { name: "Deepak Khatri", email: "deepakkhatri@perfectpixelpro.com", password: "perfectpixelpro@2025", role: "admin", department: "Management", designation: "Administrator" },
    { name: "HR Manager", email: "hr@perfectpixelpro.com", password: "perfectpixelpro@2026", role: "hr", department: "Human Resources", designation: "HR Manager" },
  ];
  for (const u of staff) await User.create({ ...u, profileCompleted: true });

  await mongoose.connection.close();
  console.log("Seed complete. Logins:");
  console.log("  deepakkhatri@perfectpixelpro.com / perfectpixelpro@2025  (admin)");
  console.log("  hr@perfectpixelpro.com / perfectpixelpro@2026  (hr)");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

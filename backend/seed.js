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
  await connectDB();

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

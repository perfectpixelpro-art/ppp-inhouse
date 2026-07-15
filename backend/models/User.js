import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const ROLES = ["admin", "hr", "employee"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: "employee",
    },
    department: {
      type: String,
      default: "",
      trim: true,
    },
    designation: {
      type: String,
      default: "",
      trim: true,
    },
    photo: {
      type: String, // image URL
      default: "",
    },
    birthdate: {
      type: Date,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    slackUserId: {
      type: String, // Slack user ID (e.g. U06H1E2GU3H) for shift-check DMs/mentions
      default: "",
      trim: true,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    monthlySalary: {
      type: Number,
      default: 0,
    },
    leaveAllowance: {
      type: Number,
      default: 24, // total paid leaves granted per year
    },
    probationStart: { type: Date },
    probationEnd: { type: Date },
    active: {
      type: Boolean,
      default: true,
    },
    // New employees must complete their profile (photo, birthdate, Slack id) on
    // first login before they can use the app. Seeded/complete users start true.
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    // Password reset (admin/HR only). We store the SHA-256 hash, never the token.
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    // Per-employee shift schedule (IST, "HH:MM"). Defaults: reminders at 8:15/8:20/
    // 8:25 PM, timer force-stops at 8:30 PM. Override per person as needed.
    shiftCapIST: { type: String, default: "20:30" },
    reminderTimesIST: { type: [String], default: ["20:15", "20:20", "20:25"] },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model("User", userSchema);

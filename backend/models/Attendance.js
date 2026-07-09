import mongoose from "mongoose";

export const ATTENDANCE_STATUS = ["present", "absent", "half-day", "leave"];
// Live shift state machine
export const ATTENDANCE_STATE = ["not_started", "working", "on_lunch", "on_break", "ended"];

const breakSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["lunch", "break"] },
    start: Date,
    end: Date,
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: String, required: true }, // YYYY-MM-DD
    checkIn: { type: Date }, // first check-in of the day
    checkOut: { type: Date }, // final end-of-day time
    status: {
      type: String,
      enum: ATTENDANCE_STATUS,
      default: "present",
    },

    // Shift timer
    dayType: { type: String, enum: ["full", "half"], default: "full" },
    state: { type: String, enum: ATTENDANCE_STATE, default: "not_started" },
    workedMs: { type: Number, default: 0 }, // accumulated worked time (completed segments)
    currentStart: { type: Date, default: null }, // start of the active work segment
    breaks: { type: [breakSchema], default: [] },
    note: { type: String, default: "" },
    autoClosed: { type: Boolean, default: false },
    dsr: { type: String, default: "" }, // daily status report / task summary
    rain: { type: Boolean, default: false }, // employee-flagged rain day — excluded from auto-deduction, HR reviews manually
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);

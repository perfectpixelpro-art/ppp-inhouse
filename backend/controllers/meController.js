import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import User from "../models/User.js";
import { applyHardStop } from "../services/attendanceHardStop.js";
import { computeLeaveDeduction } from "../services/leaveDeduction.js";
import { sendMail, staffEmails } from "../services/mail.js";

const todayYMD = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const HOUR = 3600000;
// When an employee forgets to end the day, presence defaults to a full shift.
// Full day = 8h shift + 1h lunch = 9h · Half day = 4h (no lunch).
const forgotMs = (dayType) => (dayType === "half" ? 4 * HOUR : 9 * HOUR);

// Finalize any past-day record left open (forgot to check out / end the day).
const finalizeIfStale = async (record) => {
  const open = ["working", "on_lunch", "on_break"];
  if (record.date >= todayYMD() || !open.includes(record.state)) return record;

  const where =
    record.state === "on_lunch" ? " at lunch" :
    record.state === "on_break" ? " at short break" : "";
  record.note = `Forgot to checkout${where}`;
  record.autoClosed = true;
  record.state = "ended";
  record.currentStart = null;
  record.workedMs = forgotMs(record.dayType);
  await record.save();
  return record;
};

const dayDiff = (from, to) => {
  const ms = new Date(to).setHours(0, 0, 0, 0) - new Date(from).setHours(0, 0, 0, 0);
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

// PATCH /api/me/profile  — employee completes/updates their own profile on first
// login. Requires photo + birthdate; marks the profile complete.
export const updateMyProfile = async (req, res) => {
  const { photo, birthdate, slackUserId, phone } = req.body;
  if (!photo || !birthdate) {
    return res.status(400).json({ message: "Photo and birthdate are required" });
  }
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  user.photo = photo;
  user.birthdate = birthdate;
  if (slackUserId !== undefined) user.slackUserId = slackUserId;
  if (phone !== undefined) user.phone = phone;
  user.profileCompleted = true;
  await user.save();
  res.json(user);
};

// GET /api/me/attendance  — my own records
// Today's open day is capped at 8:30 PM; past open days are flagged as forgotten.
export const myAttendance = async (req, res) => {
  const records = await Attendance.find({ employee: req.user._id }).sort({ date: -1 });
  const today = todayYMD();
  for (const r of records) {
    if (r.date === today) await applyHardStop(r);
    else await finalizeIfStale(r);
  }
  res.json(records);
};

// GET /api/me/attendance/today  — the live record for today (8:30 PM cap applied)
export const myToday = async (req, res) => {
  const record = await Attendance.findOne({ employee: req.user._id, date: todayYMD() });
  if (record) await applyHardStop(record);
  res.json(record || null);
};

// POST /api/me/attendance/checkin  { dayType? }  — start or resume the work timer
export const checkIn = async (req, res) => {
  const date = todayYMD();
  const now = new Date();
  let record = await Attendance.findOne({ employee: req.user._id, date });

  if (!record) {
    record = await Attendance.create({
      employee: req.user._id,
      date,
      status: "present",
      dayType: req.body.dayType === "half" ? "half" : "full",
      checkIn: now,
      currentStart: now,
      state: "working",
    });
    return res.status(201).json(record);
  }

  await applyHardStop(record); // may close the day if it's past 8:30 PM

  if (record.state === "working") {
    return res.status(400).json({ message: "Timer is already running" });
  }
  if (record.state === "ended") {
    return res.status(400).json({ message: "Your day has already ended (8:30 PM cap)" });
  }

  // Resuming from lunch or a short break — close the open break
  const lastBreak = record.breaks[record.breaks.length - 1];
  if (lastBreak && !lastBreak.end) lastBreak.end = now;

  record.currentStart = now;
  record.state = "working";
  if (!record.checkIn) record.checkIn = now;
  await record.save();
  res.json(record);
};

// POST /api/me/attendance/checkout  { mode: 'lunch' | 'break' | 'end' }
export const checkOut = async (req, res) => {
  const { mode } = req.body;
  if (!["lunch", "break", "end"].includes(mode)) {
    return res.status(400).json({ message: "mode must be lunch, break or end" });
  }
  const date = todayYMD();
  const now = new Date();
  const record = await Attendance.findOne({ employee: req.user._id, date });

  if (!record || record.state !== "working") {
    return res.status(400).json({ message: "You need to check in first" });
  }
  if (mode === "lunch" && record.dayType === "half") {
    return res.status(400).json({ message: "No lunch break on a half day" });
  }

  // Bank the time worked in this segment
  if (record.currentStart) {
    record.workedMs += now - new Date(record.currentStart);
  }
  record.currentStart = null;

  if (mode === "end") {
    record.state = "ended";
    record.checkOut = now;
  } else {
    record.state = mode === "lunch" ? "on_lunch" : "on_break";
    record.breaks.push({ type: mode === "lunch" ? "lunch" : "break", start: now });
  }
  await record.save();
  res.json(record);
};

// POST /api/me/attendance/dsr  { dsr }  — save the day's task report
export const saveDsr = async (req, res) => {
  const { dsr } = req.body;
  const record = await Attendance.findOne({ employee: req.user._id, date: todayYMD() });
  if (!record) return res.status(404).json({ message: "No attendance for today" });
  record.dsr = dsr || "";
  await record.save();
  res.json(record);
};

// POST /api/me/attendance/rain  { rain? }  — flag today as a rain day (default true)
export const markRain = async (req, res) => {
  const date = todayYMD();
  const rain = req.body.rain !== false;
  const record = await Attendance.findOneAndUpdate(
    { employee: req.user._id, date },
    { $set: { rain } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  if (rain) {
    staffEmails().then((to) =>
      sendMail({
        to,
        subject: `🌧 Rain day marked — ${req.user.name}`,
        html: `<p><strong>${req.user.name}</strong> marked <strong>${date}</strong> as a rain day.</p>
               <p>No automatic attendance deduction is applied for this day — please review and calculate manually.</p>`,
      })
    );
  }
  res.json(record);
};

// GET /api/me/leaves  — my own leave applications
export const myLeaves = async (req, res) => {
  const leaves = await Leave.find({ employee: req.user._id }).sort({ createdAt: -1 });
  res.json(leaves);
};

// POST /api/me/leaves  — apply for leave
export const applyLeave = async (req, res) => {
  const { fromDate, toDate, type, reason } = req.body;
  if (!fromDate || !toDate) {
    return res.status(400).json({ message: "fromDate and toDate are required" });
  }
  const leave = new Leave({
    employee: req.user._id,
    type: type || "casual",
    fromDate,
    toDate,
    days: dayDiff(fromDate, toDate),
    reason,
    attachment: req.body.attachment || "",
    status: "pending",
  });
  const ded = computeLeaveDeduction(leave, req.user);
  leave.deductionDays = ded.days;
  leave.deductType = ded.type;
  leave.deductReason = ded.reason;
  await leave.save();

  // Notify HR/admin of the new request
  staffEmails().then((to) =>
    sendMail({
      to,
      subject: `New leave request — ${req.user.name}`,
      html: `<p><strong>${req.user.name}</strong> applied for <strong>${leave.type}</strong> leave.</p>
             <p>${fmt(leave.fromDate)} → ${fmt(leave.toDate)} (${leave.days} day${leave.days === 1 ? "" : "s"})</p>
             ${leave.reason ? `<p>Reason: ${leave.reason}</p>` : ""}
             <p>Review it in the HR panel → Leave Applications.</p>`,
    })
  );

  res.status(201).json(leave);
};

// POST /api/me/leaves/:id/attachment  { attachment }  — attach a document to a
// still-pending request; recomputes the deduction (docs within 7 days → lower cut).
export const attachLeaveDoc = async (req, res) => {
  const leave = await Leave.findOne({ _id: req.params.id, employee: req.user._id });
  if (!leave) return res.status(404).json({ message: "Leave not found" });
  if (leave.status !== "pending") {
    return res.status(400).json({ message: "Documents can only be added while the request is pending" });
  }
  leave.attachment = req.body.attachment || "";
  const ded = computeLeaveDeduction(leave, req.user);
  leave.deductionDays = ded.days;
  leave.deductType = ded.type;
  leave.deductReason = ded.reason;
  await leave.save();

  staffEmails().then((to) =>
    sendMail({
      to,
      subject: `📎 Documents submitted — ${req.user.name}`,
      html: `<p><strong>${req.user.name}</strong> attached a document to their leave request (${fmt(leave.fromDate)} → ${fmt(leave.toDate)}).</p>`,
    })
  );

  res.json(leave);
};

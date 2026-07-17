import Attendance from "../models/Attendance.js";
import { recomputeWorkedMs } from "../services/attendanceEdit.js";

// PATCH /api/attendance/:id  { checkIn, checkOut }  (admin/hr) — correct a day's times
export const editAttendance = async (req, res) => {
  const rec = await Attendance.findById(req.params.id);
  if (!rec) return res.status(404).json({ message: "Record not found" });

  const { checkIn, checkOut } = req.body;
  if (checkIn) rec.checkIn = new Date(checkIn);
  if (checkOut) rec.checkOut = new Date(checkOut);
  if (!rec.checkIn || !rec.checkOut) {
    return res.status(400).json({ message: "Both in and out times are required" });
  }
  if (rec.checkOut <= rec.checkIn) {
    return res.status(400).json({ message: "Out time must be after in time" });
  }

  rec.workedMs = recomputeWorkedMs(rec.checkIn, rec.checkOut, rec.breaks);
  rec.state = "ended";       // an edited day is a finished day
  rec.currentStart = null;   // stop any running segment
  rec.status = "present";
  rec.editedBy = req.user._id;
  rec.editedAt = new Date();
  await rec.save();
  res.json(await rec.populate("employee", "name email designation photo department"));
};

// GET /api/attendance?date=YYYY-MM-DD | month=YYYY-MM | employee=
export const getAttendance = async (req, res) => {
  const filter = {};
  if (req.query.date) filter.date = req.query.date;
  else if (req.query.month && /^\d{4}-\d{2}$/.test(req.query.month)) {
    filter.date = { $regex: `^${req.query.month}` }; // date is a YYYY-MM-DD string
  }
  if (req.query.employee) filter.employee = req.query.employee;
  const records = await Attendance.find(filter)
    .populate("employee", "name email designation photo department")
    .sort({ date: -1, checkIn: 1 });
  res.json(records);
};

// POST /api/attendance  (upsert a day's record)
export const upsertAttendance = async (req, res) => {
  const { employee, date, checkIn, checkOut, status } = req.body;
  if (!employee || !date) {
    return res.status(400).json({ message: "employee and date are required" });
  }
  const record = await Attendance.findOneAndUpdate(
    { employee, date },
    {
      $set: {
        ...(checkIn !== undefined && { checkIn }),
        ...(checkOut !== undefined && { checkOut }),
        ...(status && { status }),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate("employee", "name email designation photo department");
  res.status(201).json(record);
};

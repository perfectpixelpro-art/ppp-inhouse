import Attendance from "../models/Attendance.js";

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

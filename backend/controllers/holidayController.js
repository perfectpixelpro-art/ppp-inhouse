import Holiday from "../models/Holiday.js";

// GET /api/holidays?upcoming=true
export const getHolidays = async (req, res) => {
  const filter = {};
  if (req.query.upcoming === "true") {
    filter.date = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) };
  }
  const holidays = await Holiday.find(filter).sort({ date: 1 });
  res.json(holidays);
};

// POST /api/holidays
export const createHoliday = async (req, res) => {
  const { name, date } = req.body;
  if (!name || !date) {
    return res.status(400).json({ message: "name and date are required" });
  }
  const holiday = await Holiday.create({
    name,
    date,
    type: req.body.type || "national",
    description: req.body.description,
  });
  res.status(201).json(holiday);
};

// DELETE /api/holidays/:id
export const deleteHoliday = async (req, res) => {
  const holiday = await Holiday.findByIdAndDelete(req.params.id);
  if (!holiday) return res.status(404).json({ message: "Holiday not found" });
  res.json({ message: "Holiday removed", id: req.params.id });
};

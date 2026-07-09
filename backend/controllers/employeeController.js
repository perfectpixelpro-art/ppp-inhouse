import User from "../models/User.js";

// GET /api/employees  (all users, newest first)
export const getEmployees = async (req, res) => {
  const { role } = req.query;
  const filter = role ? { role } : {};
  const employees = await User.find(filter).sort({ createdAt: -1 });
  res.json(employees);
};

// GET /api/employees/:id
export const getEmployee = async (req, res) => {
  const employee = await User.findById(req.params.id);
  if (!employee) return res.status(404).json({ message: "Employee not found" });
  res.json(employee);
};

// POST /api/employees
export const createEmployee = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }
  if (!req.body.designation) {
    return res.status(400).json({ message: "Designation is required" });
  }
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: "Email already in use" });

  const employee = await User.create({
    name,
    email,
    password,
    role: req.body.role || "employee",
    department: req.body.department,
    designation: req.body.designation,
    photo: req.body.photo,
    birthdate: req.body.birthdate || undefined,
    phone: req.body.phone,
    slackUserId: req.body.slackUserId,
    probationStart: req.body.probationStart || undefined,
    probationEnd: req.body.probationEnd || undefined,
    joinDate: req.body.joinDate || undefined,
    monthlySalary: req.body.monthlySalary || 0,
    leaveAllowance: req.body.leaveAllowance ?? 24,
  });
  res.status(201).json(employee);
};

// PUT /api/employees/:id
export const updateEmployee = async (req, res) => {
  const employee = await User.findById(req.params.id).select("+password");
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  const fields = [
    "name", "email", "role", "department", "designation", "photo",
    "birthdate", "phone", "slackUserId", "probationStart", "probationEnd", "joinDate", "monthlySalary", "leaveAllowance", "active",
  ];
  for (const f of fields) {
    if (req.body[f] !== undefined) employee[f] = req.body[f];
  }
  if (req.body.password) employee.password = req.body.password; // re-hashed by pre-save

  await employee.save();
  const obj = employee.toObject();
  delete obj.password;
  res.json(obj);
};

// DELETE /api/employees/:id
export const deleteEmployee = async (req, res) => {
  const employee = await User.findByIdAndDelete(req.params.id);
  if (!employee) return res.status(404).json({ message: "Employee not found" });
  res.json({ message: "Employee removed", id: req.params.id });
};

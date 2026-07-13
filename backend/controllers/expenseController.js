import Expense from "../models/Expense.js";

// GET /api/expenses?month=YYYY-MM
export const getExpenses = async (req, res) => {
  const filter = {};
  if (req.query.month) {
    const [y, m] = req.query.month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    filter.date = { $gte: start, $lt: end };
  }
  const expenses = await Expense.find(filter)
    .populate("addedBy", "name")
    .sort({ date: -1 });
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  res.json({ expenses, total });
};

// POST /api/expenses
export const createExpense = async (req, res) => {
  const { title, amount } = req.body;
  if (!title || amount == null) {
    return res.status(400).json({ message: "title and amount are required" });
  }
  const expense = await Expense.create({
    title,
    amount,
    category: req.body.category || "other",
    date: req.body.date || Date.now(),
    note: req.body.note,
    paidBy: req.body.paidBy,
    addedBy: req.user._id,
  });
  res.status(201).json(await expense.populate("addedBy", "name"));
};

// DELETE /api/expenses/:id
export const deleteExpense = async (req, res) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) return res.status(404).json({ message: "Expense not found" });
  res.json({ message: "Expense removed", id: req.params.id });
};

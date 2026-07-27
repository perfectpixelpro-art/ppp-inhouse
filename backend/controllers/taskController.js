import Task from "../models/Task.js";
import User from "../models/User.js";
import { TASK_STATUS } from "../models/Task.js";

const PERSON = "name email designation photo department";

// GET /api/tasks/assignable  — everyone active, for the assignee picker.
// Any authenticated user, since anyone can assign to anyone.
export const assignableUsers = async (req, res) => {
  const users = await User.find({ active: true }).select("name designation department").sort({ name: 1 });
  res.json(users);
};

// GET /api/tasks/mine  — tasks assigned TO me (the "My Tasks" view).
// Sorted so open work with the soonest due date surfaces first; done last.
export const myTasks = async (req, res) => {
  const tasks = await Task.find({ assignedTo: req.user._id })
    .populate("assignedBy", PERSON)
    .sort({ status: 1, dueDate: 1, createdAt: -1 });
  res.json(tasks);
};

// GET /api/tasks/assigned  — tasks I assigned to other people.
export const assignedByMe = async (req, res) => {
  const tasks = await Task.find({ assignedBy: req.user._id })
    .populate("assignedTo", PERSON)
    .sort({ status: 1, dueDate: 1, createdAt: -1 });
  res.json(tasks);
};

// POST /api/tasks  { title, assignedTo, dueDate }  — create + assign a task.
export const createTask = async (req, res) => {
  const { title, assignedTo, dueDate } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ message: "Title is required" });
  if (!assignedTo) return res.status(400).json({ message: "Pick who this task is for" });

  const owner = await User.findById(assignedTo).select("_id active");
  if (!owner || !owner.active) return res.status(400).json({ message: "That person can't be assigned tasks" });

  const task = await Task.create({
    title: title.trim(),
    assignedTo,
    assignedBy: req.user._id,
    dueDate: dueDate || undefined,
  });
  res.status(201).json(await task.populate("assignedTo", PERSON));
};

// PATCH /api/tasks/:id/status  { status }  — the assignee or the assigner may move it.
export const updateStatus = async (req, res) => {
  const { status } = req.body;
  if (!TASK_STATUS.includes(status)) return res.status(400).json({ message: "Invalid status" });

  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const mine = String(task.assignedTo) === String(req.user._id) || String(task.assignedBy) === String(req.user._id);
  if (!mine) return res.status(403).json({ message: "Not your task" });

  task.status = status;
  task.completedAt = status === "done" ? new Date() : undefined;
  await task.save();
  // Populate BOTH sides so the response is safe to merge into either the
  // "My tasks" (needs assignedBy) or "Assigned by me" (needs assignedTo) view.
  await task.populate([{ path: "assignedBy", select: PERSON }, { path: "assignedTo", select: PERSON }]);
  res.json(task);
};

// DELETE /api/tasks/:id  — only the person who created the task can remove it.
export const deleteTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (String(task.assignedBy) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the person who assigned this task can delete it" });
  }
  await task.deleteOne();
  res.json({ message: "Task removed", id: req.params.id });
};

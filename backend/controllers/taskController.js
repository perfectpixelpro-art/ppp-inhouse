import Task from "../models/Task.js";
import User from "../models/User.js";
import Project from "../models/Project.js";
import { TASK_STATUS, TASK_PRIORITY } from "../models/Task.js";

const PERSON = "name email designation photo department";
const PROJECT = "name";

const isStaff = (user) => user.role === "admin" || user.role === "hr";

// Am I allowed to touch this task? Admin/HR always; otherwise the assignee, the
// creator, or a member of its project.
const canTouch = async (task, user) => {
  if (isStaff(user)) return true;
  const userId = user._id;
  if (String(task.assignedTo) === String(userId) || String(task.assignedBy) === String(userId)) return true;
  if (task.projectId) {
    const p = await Project.findById(task.projectId).select("members createdBy");
    if (p && (String(p.createdBy) === String(userId) || p.members.some((m) => String(m) === String(userId)))) return true;
  }
  return false;
};

// GET /api/tasks/assignable  — everyone active, for the assignee picker.
export const assignableUsers = async (req, res) => {
  const users = await User.find({ active: true }).select("name designation department photo").sort({ name: 1 });
  res.json(users);
};

// GET /api/tasks/mine  — tasks assigned TO me (the "My Tasks" view).
export const myTasks = async (req, res) => {
  const tasks = await Task.find({ assignedTo: req.user._id })
    .populate("assignedBy", PERSON)
    .populate("projectId", PROJECT)
    .sort({ status: 1, dueDate: 1, createdAt: -1 });
  res.json(tasks);
};

// GET /api/tasks/all  — every task in the org (admin/HR only). Powers the panel
// Home / My Tasks views so staff see everyone's work.
export const allTasks = async (req, res) => {
  if (!isStaff(req.user)) return res.status(403).json({ message: "Forbidden" });
  const tasks = await Task.find({})
    .populate("assignedTo", PERSON)
    .populate("assignedBy", PERSON)
    .populate("projectId", PROJECT)
    .sort({ status: 1, dueDate: 1, createdAt: -1 });
  res.json(tasks);
};

// GET /api/tasks/assigned  — tasks I assigned to other people.
export const assignedByMe = async (req, res) => {
  const tasks = await Task.find({ assignedBy: req.user._id })
    .populate("assignedTo", PERSON)
    .populate("projectId", PROJECT)
    .sort({ status: 1, dueDate: 1, createdAt: -1 });
  res.json(tasks);
};

// GET /api/tasks?project=:id  — all tasks in a project (members only).
export const projectTasks = async (req, res) => {
  const { project } = req.query;
  if (!project) return res.status(400).json({ message: "project id is required" });
  const p = await Project.findById(project).select("members createdBy");
  if (!p) return res.status(404).json({ message: "Project not found" });
  const member = isStaff(req.user) || String(p.createdBy) === String(req.user._id) || p.members.some((m) => String(m) === String(req.user._id));
  if (!member) return res.status(403).json({ message: "Not a member of this project" });

  const tasks = await Task.find({ projectId: project })
    .populate("assignedTo", PERSON)
    .sort({ parentTask: 1, dueDate: 1, createdAt: 1 });
  res.json(tasks);
};

// GET /api/tasks/portfolio?employee=&project=  — completed tasks.
// Employees see ONLY their own completed tasks. Admin/HR see everyone's, and may
// filter by employee. Both may filter by project. Sorted newest-completed first.
export const portfolio = async (req, res) => {
  const isStaff = ["admin", "hr"].includes(req.user.role);

  const scope = { status: "done" };
  if (isStaff) {
    if (req.query.employee) scope.assignedTo = req.query.employee;
  } else {
    scope.assignedTo = req.user._id; // employees are locked to their own tasks
  }
  if (req.query.project) scope.projectId = req.query.project;

  const tasks = await Task.find(scope)
    .populate("assignedTo", PERSON)
    .populate("projectId", PROJECT)
    .sort({ completedAt: -1 });
  res.json(tasks);
};

// POST /api/tasks  — create a task. assignedTo defaults to the creator.
export const createTask = async (req, res) => {
  const { title, assignedTo, dueDate, startDate, description, priority, projectId, parentTask } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ message: "Title is required" });

  const ownerId = assignedTo || req.user._id;
  const owner = await User.findById(ownerId).select("_id active");
  if (!owner || !owner.active) return res.status(400).json({ message: "That person can't be assigned tasks" });

  // If it belongs to a project, the creator must be a member of it.
  if (projectId) {
    const p = await Project.findById(projectId).select("members createdBy");
    if (!p) return res.status(404).json({ message: "Project not found" });
    const member = isStaff(req.user) || String(p.createdBy) === String(req.user._id) || p.members.some((m) => String(m) === String(req.user._id));
    if (!member) return res.status(403).json({ message: "Not a member of this project" });
  }

  const task = await Task.create({
    title: title.trim(),
    description: description?.trim() || "",
    assignedTo: ownerId,
    assignedBy: req.user._id,
    dueDate: dueDate || undefined,
    startDate: startDate || undefined,
    priority: TASK_PRIORITY.includes(priority) ? priority : "medium",
    projectId: projectId || null,
    parentTask: parentTask || null,
  });
  await task.populate([{ path: "assignedTo", select: PERSON }, { path: "projectId", select: PROJECT }]);
  res.status(201).json(task);
};

// PATCH /api/tasks/:id  — general edit (title, description, status, priority,
// dates, timeSpent, assignedTo). Any related user may edit; see canTouch.
export const updateTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (!(await canTouch(task, req.user))) return res.status(403).json({ message: "Not your task" });

  const b = req.body;
  if (b.title !== undefined) {
    if (!b.title.trim()) return res.status(400).json({ message: "Title can't be empty" });
    task.title = b.title.trim();
  }
  if (b.description !== undefined) task.description = b.description;
  if (b.status !== undefined) {
    if (!TASK_STATUS.includes(b.status)) return res.status(400).json({ message: "Invalid status" });
    task.status = b.status; // completedAt handled by the model's pre-save hook
  }
  if (b.priority !== undefined && TASK_PRIORITY.includes(b.priority)) task.priority = b.priority;
  if (b.startDate !== undefined) task.startDate = b.startDate || undefined;
  if (b.dueDate !== undefined) task.dueDate = b.dueDate || undefined;
  if (b.timeSpent !== undefined) task.timeSpent = Math.max(0, Number(b.timeSpent) || 0);
  if (b.assignedTo !== undefined && b.assignedTo) task.assignedTo = b.assignedTo;

  await task.save();
  await task.populate([
    { path: "assignedBy", select: PERSON },
    { path: "assignedTo", select: PERSON },
    { path: "projectId", select: PROJECT },
  ]);
  res.json(task);
};

// PATCH /api/tasks/:id/status  { status }  — quick status move (kept for the
// original quick-assign UI). Assignee or creator may move it.
export const updateStatus = async (req, res) => {
  const { status } = req.body;
  if (!TASK_STATUS.includes(status)) return res.status(400).json({ message: "Invalid status" });

  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (!(await canTouch(task, req.user))) return res.status(403).json({ message: "Not your task" });

  task.status = status; // completedAt handled by the model's pre-save hook
  await task.save();
  await task.populate([
    { path: "assignedBy", select: PERSON },
    { path: "assignedTo", select: PERSON },
    { path: "projectId", select: PROJECT },
  ]);
  res.json(task);
};

// DELETE /api/tasks/:id  — creator of the task, or the project's creator.
export const deleteTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  let allowed = String(task.assignedBy) === String(req.user._id);
  if (!allowed && task.projectId) {
    const p = await Project.findById(task.projectId).select("createdBy");
    allowed = p && String(p.createdBy) === String(req.user._id);
  }
  if (!allowed) return res.status(403).json({ message: "Only the task or project creator can delete this" });

  await Task.deleteMany({ $or: [{ _id: task._id }, { parentTask: task._id }] }); // cascade subtasks
  res.json({ message: "Task removed", id: req.params.id });
};

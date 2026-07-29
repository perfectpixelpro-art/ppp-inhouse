import Project from "../models/Project.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { PM_VIEWER_ROLES } from "../models/User.js";

const PERSON = "name email designation photo department";

const isStaff = (user) => PM_VIEWER_ROLES.includes(user.role);

// Membership check that admin/HR always pass (they can see everything).
const canView = (project, user) =>
  isStaff(user) ||
  String(project.createdBy) === String(user._id) ||
  project.members.some((m) => String(m._id || m) === String(user._id));

// GET /api/projects  — projects I'm a member of (or created); admin/HR see all.
// Each carries light task stats.
export const listProjects = async (req, res) => {
  const filter = isStaff(req.user)
    ? {}
    : { $or: [{ members: req.user._id }, { createdBy: req.user._id }] };
  const projects = await Project.find(filter)
    .populate("members", PERSON)
    .populate("createdBy", PERSON)
    .sort({ createdAt: -1 });

  // Attach {total, done} task counts per project in one grouped query.
  const ids = projects.map((p) => p._id);
  const counts = await Task.aggregate([
    { $match: { projectId: { $in: ids } } },
    { $group: { _id: "$projectId", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } } } },
  ]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c]));
  const out = projects.map((p) => ({ ...p.toObject(), stats: { total: map[String(p._id)]?.total || 0, done: map[String(p._id)]?.done || 0 } }));
  res.json(out);
};

// POST /api/projects  { name, description, members }  — only admin / HR /
// project managers may create projects; employees cannot.
export const createProject = async (req, res) => {
  if (!isStaff(req.user)) {
    return res.status(403).json({ message: "Only admin, HR or a project manager can create projects" });
  }
  const { name, description, members } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: "Project name is required" });

  // Always include the creator in the member list, de-duplicated.
  const memberSet = new Set((Array.isArray(members) ? members : []).map(String));
  memberSet.add(String(req.user._id));

  const project = await Project.create({
    name: name.trim(),
    description: description?.trim() || "",
    members: [...memberSet],
    createdBy: req.user._id,
  });
  res.status(201).json(await project.populate("members", PERSON));
};

// GET /api/projects/:id  — members only.
export const getProject = async (req, res) => {
  const project = await Project.findById(req.params.id).populate("members", PERSON).populate("createdBy", PERSON);
  if (!project) return res.status(404).json({ message: "Project not found" });
  if (!canView(project, req.user)) return res.status(403).json({ message: "Not a member of this project" });
  res.json(project);
};

// GET /api/projects/:id/stats  — dashboard numbers.
export const projectStats = async (req, res) => {
  const project = await Project.findById(req.params.id).select("members createdBy");
  if (!project) return res.status(404).json({ message: "Project not found" });
  if (!canView(project, req.user)) return res.status(403).json({ message: "Not a member of this project" });

  const tasks = await Task.find({ projectId: project._id }).select("status dueDate");
  const now = new Date();
  const byStatus = { todo: 0, in_progress: 0, done: 0 };
  let overdue = 0;
  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    if (t.status !== "done" && t.dueDate && new Date(t.dueDate) < now) overdue++;
  }
  res.json({ total: tasks.length, done: byStatus.done, overdue, byStatus });
};

// PUT /api/projects/:id  — a member may edit name/description/members.
export const updateProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: "Project not found" });
  if (!canView(project, req.user)) return res.status(403).json({ message: "Not a member of this project" });

  const { name, description, members } = req.body;
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ message: "Project name can't be empty" });
    project.name = name.trim();
  }
  if (description !== undefined) project.description = description;
  if (Array.isArray(members)) {
    const set = new Set(members.map(String));
    set.add(String(project.createdBy)); // creator always stays a member
    project.members = [...set];
  }
  await project.save();
  res.json(await project.populate("members", PERSON));
};

// DELETE /api/projects/:id  — creator or admin/HR; cascades to the project's tasks.
export const deleteProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: "Project not found" });
  if (!isStaff(req.user) && String(project.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the project creator or an admin can delete it" });
  }
  await Task.deleteMany({ projectId: project._id });
  await project.deleteOne();
  res.json({ message: "Project removed", id: req.params.id });
};

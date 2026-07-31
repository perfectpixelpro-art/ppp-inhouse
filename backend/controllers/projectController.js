import Project from "../models/Project.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { PM_VIEWER_ROLES } from "../models/User.js";
import { CLOSED_STATUSES } from "../models/Task.js";

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
  const { name, description, members, slackChannelId } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: "Project name is required" });

  // Members = the chosen employees + the creator + all admin/HR/project managers,
  // who are added to every project automatically. De-duplicated.
  const memberSet = new Set((Array.isArray(members) ? members : []).map(String));
  memberSet.add(String(req.user._id));
  const staffUsers = await User.find({ role: { $in: PM_VIEWER_ROLES }, active: true }).select("_id");
  staffUsers.forEach((u) => memberSet.add(String(u._id)));

  const project = await Project.create({
    name: name.trim(),
    description: description?.trim() || "",
    slackChannelId: (slackChannelId || "").trim(),
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
  const byStatus = { todo: 0, in_progress: 0, in_review: 0, approved: 0, done: 0 };
  let overdue = 0;
  let done = 0; // "completed" = closed (approved or done)
  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    const closed = CLOSED_STATUSES.includes(t.status);
    if (closed) done++;
    else if (t.dueDate && new Date(t.dueDate) < now) overdue++;
  }
  res.json({ total: tasks.length, done, overdue, byStatus });
};

// GET /api/projects/:id/assets  — every file submitted across the project's tasks.
// Members (and staff) only. Staff therefore see all employees' assets.
export const projectAssets = async (req, res) => {
  const project = await Project.findById(req.params.id).select("members createdBy");
  if (!project) return res.status(404).json({ message: "Project not found" });
  if (!canView(project, req.user)) return res.status(403).json({ message: "Not a member of this project" });

  const tasks = await Task.find({ projectId: project._id, "submission.files.0": { $exists: true } })
    .populate("assignedTo", "name photo")
    .select("title assignedTo submission");

  const assets = [];
  for (const t of tasks) {
    for (const f of t.submission?.files || []) {
      assets.push({
        url: f.url, name: f.name, kind: f.kind,
        taskId: t._id, taskTitle: t.title,
        assignee: t.assignedTo, submittedAt: t.submission.submittedAt,
      });
    }
  }
  assets.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  res.json(assets);
};

// GET /api/projects/:id/resources  — the shared board (members + staff).
export const listResources = async (req, res) => {
  const project = await Project.findById(req.params.id).populate("resources.addedBy", "name photo").select("resources members createdBy");
  if (!project) return res.status(404).json({ message: "Project not found" });
  if (!canView(project, req.user)) return res.status(403).json({ message: "Not a member of this project" });
  const sorted = [...project.resources].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
};

// POST /api/projects/:id/resources  { kind, url, name, fileKind, text }  — any member adds.
export const addResource = async (req, res) => {
  const project = await Project.findById(req.params.id).select("resources members createdBy");
  if (!project) return res.status(404).json({ message: "Project not found" });
  if (!canView(project, req.user)) return res.status(403).json({ message: "Not a member of this project" });

  const { kind, url, name, fileKind, text } = req.body;
  if (!["file", "link", "text"].includes(kind)) return res.status(400).json({ message: "Invalid kind" });
  if (kind === "text" && !text?.trim()) return res.status(400).json({ message: "Text can't be empty" });
  if ((kind === "file" || kind === "link") && !url) return res.status(400).json({ message: "A URL is required" });

  project.resources.push({
    kind, url: url || "", name: name || "", fileKind: fileKind || "file",
    text: (text || "").trim(), addedBy: req.user._id, createdAt: new Date(),
  });
  await project.save();
  await project.populate("resources.addedBy", "name photo");
  res.status(201).json([...project.resources].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
};

// DELETE /api/projects/:id/resources/:resId  — the person who added it, or staff.
export const removeResource = async (req, res) => {
  const project = await Project.findById(req.params.id).select("resources members createdBy");
  if (!project) return res.status(404).json({ message: "Project not found" });
  if (!canView(project, req.user)) return res.status(403).json({ message: "Not a member of this project" });

  const r = project.resources.id(req.params.resId);
  if (!r) return res.status(404).json({ message: "Not found" });
  if (!isStaff(req.user) && String(r.addedBy) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only remove what you added" });
  }
  project.resources.pull({ _id: req.params.resId });
  await project.save();
  res.json({ message: "Removed", id: req.params.resId });
};

// PUT /api/projects/:id  — a member may edit name/description/members.
export const updateProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: "Project not found" });
  if (!canView(project, req.user)) return res.status(403).json({ message: "Not a member of this project" });

  const { name, description, members, slackChannelId } = req.body;
  if (slackChannelId !== undefined) project.slackChannelId = (slackChannelId || "").trim();
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

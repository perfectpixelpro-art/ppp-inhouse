import Task from "../models/Task.js";
import User from "../models/User.js";
import Project from "../models/Project.js";
import { TASK_STATUS, TASK_PRIORITY, CLOSED_STATUSES } from "../models/Task.js";
import { PM_VIEWER_ROLES } from "../models/User.js";
import {
  notifyTaskAssignment, notifyReviewRequest,
  notifyTaskStart, notifyTaskComplete, notifyReviewToProject, notifyApproved, notifyChangesRequested,
  SLACK_HR_ID, SLACK_ADMIN_ID,
} from "../services/slack.js";

const PERSON = "name email designation photo department";
const PROJECT = "name";

const isStaff = (user) => PM_VIEWER_ROLES.includes(user.role);

// --- automatic time tracking helpers ---
const markStarted = (task) => { if (!task.startedAt) task.startedAt = new Date(); };
const enterReview = (task) => { if (!task.reviewStartedAt) task.reviewStartedAt = new Date(); };
const leaveReview = (task) => {
  if (task.reviewStartedAt) {
    task.reviewMs = (task.reviewMs || 0) + (Date.now() - new Date(task.reviewStartedAt).getTime());
    task.reviewStartedAt = undefined;
  }
};
// Worked time on completion = (now − start) − review. Called when a task closes.
const finalizeActive = (task) => {
  if (task.startedAt) {
    task.activeMs = Math.max(0, Date.now() - new Date(task.startedAt).getTime() - (task.reviewMs || 0));
  }
};

// A user's Slack id (accepts a populated user or an id).
const slackIdOf = async (userOrId) => {
  if (!userOrId) return "";
  if (userOrId.slackUserId !== undefined) return userOrId.slackUserId || "";
  const u = await User.findById(userOrId._id || userOrId).select("slackUserId");
  return u?.slackUserId || "";
};

// The Slack channel configured on a task's project (empty string if none).
const projectChannelOf = async (task) => {
  if (!task.projectId) return "";
  const id = task.projectId._id || task.projectId;
  const p = await Project.findById(id).select("slackChannelId");
  return p?.slackChannelId || "";
};

// Slack ids to tag on review: HR + Admin (configured) + every project manager
// with a Slack id set, plus any extra reviewers the submitter named.
const reviewTagIds = async (extraUsers = []) => {
  const pms = await User.find({ role: "project_manager", active: true, slackUserId: { $ne: "" } }).select("slackUserId");
  return [SLACK_HR_ID(), SLACK_ADMIN_ID(), ...pms.map((u) => u.slackUserId), ...extraUsers.map((u) => u.slackUserId).filter(Boolean)];
};

// Announce assignments to Slack (fire-and-forget). `tasks` are created docs with
// assignedTo/projectId; we look up each assignee's Slack id for the @mention.
const announceAssignments = async (tasks, assignerName) => {
  const ids = [...new Set(tasks.map((t) => String(t.assignedTo?._id || t.assignedTo)))];
  const users = await User.find({ _id: { $in: ids } }).select("name slackUserId");
  const umap = Object.fromEntries(users.map((u) => [String(u._id), u]));
  const items = tasks.map((t) => ({
    title: t.title,
    projectName: t.projectId?.name || null,
    dueDate: t.dueDate || null,
    assignee: umap[String(t.assignedTo?._id || t.assignedTo)] || { name: t.assignedTo?.name },
  }));
  await notifyTaskAssignment({ assignerName, items });
};

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
  const staff = isStaff(req.user);

  const scope = { status: { $in: CLOSED_STATUSES } };
  if (staff) {
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

// POST /api/tasks  — create a task.
//  - Top-level tasks: only admin / HR / project managers may create.
//  - Subtasks (parentTask set): anyone who can touch the parent may create one
//    (so employees can break their own work into subtasks). A subtask always
//    inherits its parent's project.
export const createTask = async (req, res) => {
  const { title, assignedTo, dueDate, startDate, description, priority, projectId, parentTask } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ message: "Title is required" });

  let effectiveProjectId = projectId || null;

  if (parentTask) {
    const parent = await Task.findById(parentTask);
    if (!parent) return res.status(404).json({ message: "Parent task not found" });
    if (!(await canTouch(parent, req.user))) return res.status(403).json({ message: "Not your task" });
    effectiveProjectId = parent.projectId || null;
  } else {
    if (!isStaff(req.user)) {
      return res.status(403).json({ message: "Only admin, HR or a project manager can create tasks" });
    }
    if (effectiveProjectId) {
      const p = await Project.findById(effectiveProjectId).select("members createdBy");
      if (!p) return res.status(404).json({ message: "Project not found" });
      const member = isStaff(req.user) || String(p.createdBy) === String(req.user._id) || p.members.some((m) => String(m) === String(req.user._id));
      if (!member) return res.status(403).json({ message: "Not a member of this project" });
    }
  }

  const ownerId = assignedTo || req.user._id;
  const owner = await User.findById(ownerId).select("_id active");
  if (!owner || !owner.active) return res.status(400).json({ message: "That person can't be assigned tasks" });

  const task = await Task.create({
    title: title.trim(),
    description: description?.trim() || "",
    assignedTo: ownerId,
    assignedBy: req.user._id,
    dueDate: dueDate || undefined,
    startDate: startDate || undefined,
    priority: TASK_PRIORITY.includes(priority) ? priority : "medium",
    projectId: effectiveProjectId,
    parentTask: parentTask || null,
  });
  await task.populate([{ path: "assignedTo", select: PERSON }, { path: "projectId", select: PROJECT }]);

  // Announce new top-level assignments to Slack (not subtasks).
  if (!parentTask) {
    announceAssignments([task], req.user.name).catch((e) => console.error("[slack] task notify failed:", e.message));
  }
  res.status(201).json(task);
};

// POST /api/tasks/bulk  { tasks: [{ title, assignedTo, projectId, priority, dueDate, startDate, description }] }
// Assign many different tasks to different people at once. Staff only.
export const createTasksBulk = async (req, res) => {
  if (!isStaff(req.user)) {
    return res.status(403).json({ message: "Only admin, HR or a project manager can create tasks" });
  }
  const items = Array.isArray(req.body.tasks) ? req.body.tasks : [];
  if (!items.length) return res.status(400).json({ message: "No tasks to assign" });

  // Validate every row first so it's all-or-nothing.
  const prepared = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it.title || !it.title.trim()) return res.status(400).json({ message: `Row ${i + 1}: title is required` });
    const ownerId = it.assignedTo || req.user._id;
    const owner = await User.findById(ownerId).select("_id active");
    if (!owner || !owner.active) return res.status(400).json({ message: `Row ${i + 1}: pick a valid assignee` });
    if (it.projectId) {
      const p = await Project.findById(it.projectId).select("members createdBy");
      if (!p) return res.status(400).json({ message: `Row ${i + 1}: project not found` });
    }
    prepared.push({
      title: it.title.trim(),
      description: it.description?.trim() || "",
      assignedTo: ownerId,
      assignedBy: req.user._id,
      projectId: it.projectId || null,
      priority: TASK_PRIORITY.includes(it.priority) ? it.priority : "medium",
      dueDate: it.dueDate || undefined,
      startDate: it.startDate || undefined,
    });
  }

  const created = await Task.insertMany(prepared);
  const populated = await Task.find({ _id: { $in: created.map((c) => c._id) } })
    .populate("assignedTo", PERSON)
    .populate("projectId", PROJECT);

  announceAssignments(populated, req.user.name).catch((e) => console.error("[slack] bulk notify failed:", e.message));
  res.status(201).json(populated);
};

// PATCH /api/tasks/:id  — general edit (title, description, status, priority,
// dates, timeSpent, assignedTo). Any related user may edit; see canTouch.
export const updateTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (!(await canTouch(task, req.user))) return res.status(403).json({ message: "Not your task" });

  const b = req.body;
  const prevStatus = task.status;
  if (b.title !== undefined) {
    if (!b.title.trim()) return res.status(400).json({ message: "Title can't be empty" });
    task.title = b.title.trim();
  }
  if (b.description !== undefined) task.description = b.description;
  let approvedNow = false;
  if (b.status !== undefined) {
    if (!TASK_STATUS.includes(b.status)) return res.status(400).json({ message: "Invalid status" });
    if (b.status === "approved" && !isStaff(req.user)) {
      return res.status(403).json({ message: "Only admin, HR or a project manager can approve a task" });
    }
    const eff = b.status === "approved" ? "done" : b.status; // effective new status

    // Time tracking around review + start + completion.
    if (prevStatus === "in_review" && eff !== "in_review") leaveReview(task);
    else if (prevStatus !== "in_review" && eff === "in_review") enterReview(task);
    if (eff === "in_progress") markStarted(task);

    if (b.status === "approved") { task.reviewedBy = req.user._id; task.status = "done"; approvedNow = true; }
    else task.status = b.status; // completedAt handled by the model's pre-save hook

    if (CLOSED_STATUSES.includes(eff)) finalizeActive(task);
  }
  if (b.priority !== undefined && TASK_PRIORITY.includes(b.priority)) task.priority = b.priority;
  if (b.startDate !== undefined) task.startDate = b.startDate || undefined;
  if (b.dueDate !== undefined) task.dueDate = b.dueDate || undefined;
  if (b.timeSpent !== undefined) task.timeSpent = Math.max(0, Number(b.timeSpent) || 0);
  if (b.assignedTo !== undefined && b.assignedTo) task.assignedTo = b.assignedTo;
  // Dependencies are managed via the dedicated /dependencies endpoints, not here.

  await task.save();
  await task.populate([
    { path: "assignedBy", select: PERSON },
    { path: "assignedTo", select: PERSON },
    { path: "projectId", select: PROJECT },
  ]);

  // Post start / complete / approved events to the project's Slack channel.
  if (b.status && (approvedNow || b.status !== prevStatus)) {
    (async () => {
      const channelId = await projectChannelOf(task);
      if (!channelId) return;
      if (approvedNow) {
        await notifyApproved({ channelId, approverName: req.user.name, taskTitle: task.title, assigneeSlackId: await slackIdOf(task.assignedTo) });
      } else if (b.status === "in_progress" && prevStatus === "todo") {
        await notifyTaskStart({ channelId, userName: req.user.name, taskTitle: task.title });
      } else if (b.status === "done") {
        await notifyTaskComplete({ channelId, userName: req.user.name, taskTitle: task.title });
      }
    })().catch((e) => console.error("[slack] status notify failed:", e.message));
  }

  res.json(task);
};

// POST /api/tasks/:id/request-changes  { note }  — a reviewer sends the task back
// with what needs changing: status → in_progress, adds a comment, and notifies the
// project channel (tagging the assignee) with the change note.
export const requestChanges = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (!isStaff(req.user)) return res.status(403).json({ message: "Only a reviewer can request changes" });
  const note = (req.body.note || "").trim();
  if (!note) return res.status(400).json({ message: "Describe what needs changing" });

  leaveReview(task); // stop counting review time
  task.status = "in_progress";
  task.reviewedBy = req.user._id;
  task.comments.push({ author: req.user._id, text: `🔁 Changes requested: ${note}` });
  await task.save();
  await task.populate([
    { path: "assignedTo", select: PERSON },
    { path: "assignedBy", select: PERSON },
    { path: "projectId", select: PROJECT },
    { path: "comments.author", select: "name photo" },
  ]);

  (async () => {
    const channelId = await projectChannelOf(task);
    if (!channelId) return;
    await notifyChangesRequested({
      channelId, reviewerName: req.user.name, taskTitle: task.title,
      assigneeSlackId: await slackIdOf(task.assignedTo), note,
    });
  })().catch((e) => console.error("[slack] changes notify failed:", e.message));

  res.json(task);
};

const DEP_POPULATE = [
  { path: "dependencies.task", select: "title status" },
  { path: "dependencies.person", select: "name photo" },
];

// POST /api/tasks/:id/dependencies  { kind, task?, person?, reason }
// A dependency is a task in the same project, or a person, with a reason.
// The assignee or any staff member may add one.
export const addDependency = async (req, res) => {
  const { kind, reason } = req.body;
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (!(await canTouch(task, req.user))) return res.status(403).json({ message: "Not your task" });

  if (kind === "task") {
    const depId = req.body.task;
    if (!depId) return res.status(400).json({ message: "Pick a task" });
    if (String(depId) === String(task._id)) return res.status(400).json({ message: "A task can't depend on itself" });
    if (!task.projectId) return res.status(400).json({ message: "Only tasks in a project can depend on tasks" });
    const dep = await Task.findOne({ _id: depId, projectId: task.projectId }).select("_id");
    if (!dep) return res.status(400).json({ message: "The task must be in the same project" });
    task.dependencies.push({ kind: "task", task: depId, reason: (reason || "").trim() });
  } else if (kind === "person") {
    if (!req.body.person) return res.status(400).json({ message: "Pick a person" });
    const u = await User.findById(req.body.person).select("_id active name");
    if (!u || !u.active) return res.status(400).json({ message: "That person can't be added" });
    // A person dependency spawns a real task for that person (same project) so the
    // work they're blocking on shows up in their own task list.
    const reasonText = (reason || "").trim();
    const spawned = await Task.create({
      title: reasonText || `Support: ${task.title}`,
      description: `Blocking "${task.title}" — requested by ${req.user.name}`,
      assignedTo: u._id,
      assignedBy: req.user._id,
      projectId: task.projectId || null,
      dueDate: task.dueDate || undefined,
    });
    task.dependencies.push({ kind: "person", person: u._id, task: spawned._id, reason: reasonText });
  } else {
    return res.status(400).json({ message: "kind must be 'task' or 'person'" });
  }

  await task.save();
  await task.populate(DEP_POPULATE);
  res.status(201).json(task.dependencies);
};

// DELETE /api/tasks/:id/dependencies/:depId  — remove one dependency.
export const removeDependency = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (!(await canTouch(task, req.user))) return res.status(403).json({ message: "Not your task" });

  // Removing a person dependency also removes the task that was spawned for them.
  const dep = task.dependencies.id(req.params.depId);
  if (dep?.kind === "person" && dep.task) {
    await Task.deleteMany({ $or: [{ _id: dep.task }, { parentTask: dep.task }] });
  }
  task.dependencies.pull({ _id: req.params.depId });
  await task.save();
  await task.populate(DEP_POPULATE);
  res.json(task.dependencies);
};

// GET /api/tasks/:id  — full task detail: populated fields, comments, deps, subtasks.
export const getTaskDetail = async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate("assignedTo", PERSON)
    .populate("assignedBy", PERSON)
    .populate("projectId", PROJECT)
    .populate("reviewedBy", "name")
    .populate("reviewers", "name photo")
    .populate("submission.submittedBy", "name")
    .populate("comments.author", "name photo")
    .populate("dependencies.task", "title status")
    .populate("dependencies.person", "name photo");
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (!(await canTouch(task, req.user))) return res.status(403).json({ message: "Not your task" });

  const subtasks = await Task.find({ parentTask: task._id }).populate("assignedTo", PERSON).sort({ createdAt: 1 });
  res.json({ ...task.toObject(), subtasks });
};

// POST /api/tasks/:id/comments  { text }  — anyone who can see the task may comment.
export const addComment = async (req, res) => {
  const text = (req.body.text || "").trim();
  if (!text) return res.status(400).json({ message: "Comment can't be empty" });

  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (!(await canTouch(task, req.user))) return res.status(403).json({ message: "Not your task" });

  task.comments.push({ author: req.user._id, text });
  await task.save();
  await task.populate("comments.author", "name photo");
  res.status(201).json(task.comments);
};

// POST /api/tasks/:id/submit-review  { note, links[], files[{url,name,kind}], reviewers[] }
// The assignee (or staff) submits their work for review: saves the submission +
// chosen extra reviewers and moves the task to "in_review". Admin/HR/PM can always
// review; the reviewers list is just the additional people the submitter named.
export const submitReview = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (!(await canTouch(task, req.user))) return res.status(403).json({ message: "Not your task" });

  const { note, links, files, reviewers } = req.body;
  let revUsers = [];
  if (Array.isArray(reviewers) && reviewers.length) {
    revUsers = await User.find({ _id: { $in: reviewers }, active: true }).select("name slackUserId");
  }

  // Accumulate files/links across re-submissions so no asset is ever lost; the
  // note is the latest one.
  const prevFiles = (task.submission?.files || []).map((f) => ({ url: f.url, name: f.name, kind: f.kind }));
  const newFiles = Array.isArray(files) ? files.filter((f) => f && f.url).map((f) => ({ url: f.url, name: f.name || "", kind: f.kind || "file" })) : [];
  const mergedFiles = [...prevFiles];
  for (const f of newFiles) if (!mergedFiles.some((x) => x.url === f.url)) mergedFiles.push(f);
  const newLinks = Array.isArray(links) ? links.map((l) => String(l).trim()).filter(Boolean) : [];
  const mergedLinks = [...new Set([...(task.submission?.links || []), ...newLinks])];

  task.submission = {
    note: (note || "").trim(),
    links: mergedLinks,
    files: mergedFiles,
    submittedAt: new Date(),
    submittedBy: req.user._id,
  };
  task.reviewers = revUsers.map((u) => u._id);
  markStarted(task);   // submitting implies work has begun
  enterReview(task);   // start counting review time
  task.status = "in_review";
  await task.save();
  await task.populate([
    { path: "assignedTo", select: PERSON },
    { path: "assignedBy", select: PERSON },
    { path: "projectId", select: PROJECT },
    { path: "reviewers", select: "name photo" },
    { path: "submission.submittedBy", select: "name" },
  ]);

  // Notify the project's Slack channel, tagging HR + Admin + PMs (+ extra
  // reviewers), with the submission the employee filled in.
  (async () => {
    const channelId = await projectChannelOf(task);
    if (!channelId) return; // no project channel → nothing to post to
    const tagIds = await reviewTagIds(revUsers);
    await notifyReviewToProject({
      channelId,
      taskTitle: task.title,
      submitterName: req.user.name,
      tagIds,
      submission: task.submission,
    });
  })().catch((e) => console.error("[slack] review notify failed:", e.message));

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

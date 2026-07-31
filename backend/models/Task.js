import mongoose from "mongoose";

// todo → in_progress → in_review → approved → done. "approved" and "done" are both
// closed states (work finished / signed off); the rest are open/active.
export const TASK_STATUS = ["todo", "in_progress", "in_review", "approved", "done"];
export const CLOSED_STATUSES = ["approved", "done"];
export const TASK_PRIORITY = ["low", "medium", "high"];

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// A dependency (something this task is blocked by) — either another task in the
// same project, or a person (e.g. "waiting on the UI/UX designer"), with a reason.
const dependencySchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["task", "person"], required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    person: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reason: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true },
    description: { type: String, default: "", trim: true },
    // A task may belong to a project (Project Management module) or stand alone
    // (the original quick-assign flow). Null projectId = standalone task.
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    // Anyone can assign to anyone: assignedBy is the creator, assignedTo the primary
    // owner, coAssignees additional people the task is also assigned to.
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    coAssignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: TASK_STATUS, default: "todo" },
    priority: { type: String, enum: TASK_PRIORITY, default: "medium" },
    startDate: { type: Date },
    dueDate: { type: Date },
    timeSpent: { type: Number, default: 0 }, // minutes logged manually
    // Automatic time tracking: start → complete, minus time spent in review.
    startedAt: { type: Date }, // first time it moved to in_progress
    reviewStartedAt: { type: Date }, // when it entered in_review (transient)
    reviewMs: { type: Number, default: 0 }, // total time spent under review
    activeMs: { type: Number, default: 0 }, // worked time = (done − start) − review
    // Subtasks point at their parent; top-level tasks have parentTask = null.
    parentTask: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    // "This task is blocked by these" — tasks (same project) and/or people, each
    // with an optional reason. See dependencySchema.
    dependencies: { type: [dependencySchema], default: [] },
    comments: { type: [commentSchema], default: [] },
    // Extra reviewers the assignee adds when submitting for review (admin/HR/PM can
    // always review regardless). See submission below.
    reviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // What the assignee submitted for review — notes, links and uploaded files
    // (images / videos / docs). Overwritten on each re-submission.
    submission: {
      note: { type: String, default: "" },
      links: { type: [String], default: [] },
      files: {
        type: [{ url: String, name: String, kind: String }], // kind: image | video | file
        default: [],
      },
      submittedAt: Date,
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who approved / requested changes
    completedAt: { type: Date }, // set automatically when status becomes closed
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ parentTask: 1 });

// Keep completedAt in lockstep with status on every save path.
taskSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    const closed = CLOSED_STATUSES.includes(this.status);
    if (closed && !this.completedAt) this.completedAt = new Date();
    if (!closed) this.completedAt = undefined;
  }
  next();
});

export default mongoose.model("Task", taskSchema);

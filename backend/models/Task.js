import mongoose from "mongoose";

export const TASK_STATUS = ["todo", "in_progress", "done"];
export const TASK_PRIORITY = ["low", "medium", "high"];

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true },
    description: { type: String, default: "", trim: true },
    // A task may belong to a project (Project Management module) or stand alone
    // (the original quick-assign flow). Null projectId = standalone task.
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    // Anyone can assign to anyone: assignedBy is the creator, assignedTo the owner.
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: TASK_STATUS, default: "todo" },
    priority: { type: String, enum: TASK_PRIORITY, default: "medium" },
    startDate: { type: Date },
    dueDate: { type: Date },
    timeSpent: { type: Number, default: 0 }, // minutes logged against the task
    // Subtasks point at their parent; top-level tasks have parentTask = null.
    parentTask: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    completedAt: { type: Date }, // set automatically when status flips to "done"
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ parentTask: 1 });

// Keep completedAt in lockstep with status on every save path (controller edits,
// project updates, subtask changes) so it can never drift.
taskSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "done" && !this.completedAt) this.completedAt = new Date();
    if (this.status !== "done") this.completedAt = undefined;
  }
  next();
});

export default mongoose.model("Task", taskSchema);

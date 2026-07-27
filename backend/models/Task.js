import mongoose from "mongoose";

export const TASK_STATUS = ["todo", "in_progress", "done"];

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true },
    // Anyone can assign to anyone: assignedBy is the creator, assignedTo the owner.
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date },
    status: { type: String, enum: TASK_STATUS, default: "todo" },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1 });

export default mongoose.model("Task", taskSchema);

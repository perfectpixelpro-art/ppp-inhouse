import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Project name is required"], trim: true },
    description: { type: String, default: "", trim: true },
    // Existing portal users — referenced by id, no new User model.
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

projectSchema.index({ members: 1 });

export default mongoose.model("Project", projectSchema);

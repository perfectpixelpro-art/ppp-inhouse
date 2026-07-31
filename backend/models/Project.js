import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Project name is required"], trim: true },
    description: { type: String, default: "", trim: true },
    // Slack channel where this project's task events (start / review / complete)
    // are posted. Set when the project is created.
    slackChannelId: { type: String, default: "", trim: true },
    // Existing portal users — referenced by id, no new User model.
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Shared board — any member can post files / links / text, visible to all members.
    resources: {
      type: [
        {
          kind: { type: String, enum: ["file", "link", "text"], required: true },
          url: String,
          name: String,
          fileKind: String, // image | video | file (for kind=file)
          text: String, // for kind=text
          addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

projectSchema.index({ members: 1 });

export default mongoose.model("Project", projectSchema);

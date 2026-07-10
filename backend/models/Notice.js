import mongoose from "mongoose";

const ackSchema = new mongoose.Schema(
  { employee: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, note: { type: String, default: "" }, at: Date },
  { _id: false }
);

const noticeSchema = new mongoose.Schema(
  {
    message: { type: String, default: "" },
    image: { type: String, default: "" },
    audience: { type: String, enum: ["all", "user"], default: "all" },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // set when audience === "user"
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    acks: { type: [ackSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Notice", noticeSchema);

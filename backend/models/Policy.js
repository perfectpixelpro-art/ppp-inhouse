import mongoose from "mongoose";

// ponytail: singleton — one company policy document, not per-record.
const policySchema = new mongoose.Schema(
  { content: { type: String, default: "" } },
  { timestamps: true }
);

export default mongoose.model("Policy", policySchema);

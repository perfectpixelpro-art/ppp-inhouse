import mongoose from "mongoose";

export const LEAVE_TYPES = ["casual", "sick", "paid", "unpaid"];
export const LEAVE_STATUS = ["pending", "approved", "rejected"];

const leaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: LEAVE_TYPES,
      default: "casual",
    },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    days: { type: Number, default: 1 },
    reason: { type: String, default: "", trim: true },
    attachment: { type: String, default: "" }, // optional supporting image
    status: {
      type: String,
      enum: LEAVE_STATUS,
      default: "pending",
    },
    reviewNote: { type: String, default: "", trim: true }, // HR/admin remark shown to employee
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deductionDays: { type: Number, default: 0 },
    deductType: { type: String, enum: ["salary", "leave"], default: "leave" },
    deductReason: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Leave", leaveSchema);

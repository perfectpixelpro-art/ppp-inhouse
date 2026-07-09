import mongoose from "mongoose";

export const EXPENSE_CATEGORIES = [
  "salary",
  "office",
  "travel",
  "utilities",
  "equipment",
  "marketing",
  "other",
];

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      default: "other",
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    note: { type: String, default: "", trim: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Expense", expenseSchema);

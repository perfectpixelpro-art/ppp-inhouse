import mongoose from "mongoose";

export const HOLIDAY_TYPES = ["national", "festival", "company", "special"];

const holidaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: HOLIDAY_TYPES,
      default: "national",
    },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Holiday", holidaySchema);

import mongoose from "mongoose";

export const HOLIDAY_TYPES = ["national", "festival", "company", "special"];

const holidaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Optional: festivals whose date shifts each year (Holi, Diwali…) are stored
    // name-only until the real date is imported from Google Calendar.
    date: { type: Date },
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

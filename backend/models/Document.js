import mongoose from "mongoose";

export const DOC_TYPES = [
  "aadhar",
  "pan",
  "passport",
  "driving-license",
  "resume",
  "offer-letter",
  "other",
];

const documentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    docType: {
      type: String,
      enum: DOC_TYPES,
      default: "other",
    },
    number: { type: String, default: "", trim: true },
    fileUrl: { type: String, default: "" }, // legacy single file
    images: { type: [String], default: [] }, // multiple document images
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Document", documentSchema);

import mongoose from "mongoose";

const gallerySchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true },
    imageUrl: { type: String, required: true },
    caption: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Gallery", gallerySchema);

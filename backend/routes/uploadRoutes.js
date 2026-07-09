import { Router } from "express";
import path from "path";
import fs from "fs";
import { protect } from "../middleware/auth.js";
import { uploadImage, UPLOAD_DIR } from "../middleware/upload.js";
import { cloudinaryConfigured, uploadBuffer } from "../services/cloudinary.js";

const router = Router();

// POST /api/uploads  (any authenticated user) — returns { url }
// Production: Cloudinary (https CDN URL). Dev fallback: local disk (/uploads/...).
router.post("/", protect, uploadImage.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  try {
    if (cloudinaryConfigured()) {
      const url = await uploadBuffer(req.file.buffer);
      return res.status(201).json({ url });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), req.file.buffer);
    res.status(201).json({ url: `/uploads/${name}` });
  } catch (e) {
    res.status(500).json({ message: "Upload failed: " + e.message });
  }
});

export default router;

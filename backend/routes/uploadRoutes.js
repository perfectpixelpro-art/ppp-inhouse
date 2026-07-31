import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { uploadImage, uploadAttachment, fileKind } from "../middleware/upload.js";

const router = Router();

// The server's public base URL, so uploaded-file links are absolute (Slack image
// blocks and emails only render absolute https URLs). Set PUBLIC_URL in .env to
// the domain the API is reachable at; falls back to CLIENT_URL, then relative.
const publicBase = () => (process.env.PUBLIC_URL || process.env.CLIENT_URL || "").replace(/\/$/, "");
const absoluteUrl = (p) => (p.startsWith("http") ? p : `${publicBase()}${p}`);

// POST /api/uploads  (any authenticated user) — returns { url }
// Production: Cloudinary (https CDN URL). Dev fallback: local disk (/uploads/...).
// Images stream to local disk (see middleware/upload.js) — multer has already
// written the file, so req.file has { filename }. Served from /uploads.
router.post("/", protect, uploadImage.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  try {
    res.status(201).json({ url: absoluteUrl(`/uploads/${req.file.filename}`) });
  } catch (e) {
    res.status(500).json({ message: "Upload failed: " + e.message });
  }
});

// POST /api/uploads/file  — any authenticated user — images / videos / docs.
// Returns { url, name, kind } for review-submission attachments.
// Attachments stream to local disk (see middleware/upload.js). multer has already
// written the file, so req.file has { filename, path } — not a buffer. We serve it
// from /uploads and return an absolute URL so Slack/email can render it.
router.post("/file", protect, uploadAttachment.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  try {
    const kind = fileKind(req.file.mimetype);
    const url = absoluteUrl(`/uploads/${req.file.filename}`);
    res.status(201).json({ url, name: req.file.originalname, kind });
  } catch (e) {
    res.status(500).json({ message: "Upload failed: " + e.message });
  }
});

export default router;

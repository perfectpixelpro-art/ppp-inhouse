import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Keep the file in memory so the route can push it to Cloudinary (production) or
// write it to UPLOAD_DIR (dev fallback). See routes/uploadRoutes.js.
const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if (/^image\/(png|jpe?g|webp|gif|heic|heif)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only image files are allowed"));
};

export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Broader upload for review submissions: images, video, PDF, Office docs, text.
const attachmentFilter = (req, file, cb) => {
  const ok =
    /^(image|video)\//.test(file.mimetype) ||
    /(pdf|msword|officedocument|ms-excel|ms-powerpoint|text\/|zip|csv)/.test(file.mimetype);
  cb(ok ? null : new Error("Unsupported file type"), ok);
};

export const uploadAttachment = multer({
  storage,
  fileFilter: attachmentFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB (videos)
});

// Rough bucket for the frontend to render (thumbnail / player / link).
export const fileKind = (mimetype = "") =>
  mimetype.startsWith("image/") ? "image" : mimetype.startsWith("video/") ? "video" : "file";

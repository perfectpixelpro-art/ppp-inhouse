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
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB — profile / gallery images (Cloudinary)
});

// Broader upload for review submissions: images, video, PDF, Office docs, text.
const attachmentFilter = (req, file, cb) => {
  const ok =
    /^(image|video)\//.test(file.mimetype) ||
    /(pdf|msword|officedocument|ms-excel|ms-powerpoint|text\/|zip|csv)/.test(file.mimetype);
  cb(ok ? null : new Error("Unsupported file type"), ok);
};

// Large attachments (videos up to 500 MB) STREAM TO DISK, never buffered in RAM,
// so a big upload can't exhaust the server's memory. Stored under UPLOAD_DIR and
// served from /uploads. Cloudinary is intentionally bypassed for these (its free
// tier caps videos at 100 MB anyway).
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

export const uploadAttachment = multer({
  storage: diskStorage,
  fileFilter: attachmentFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB (videos) — streamed to disk
});

// Rough bucket for the frontend to render (thumbnail / player / link).
export const fileKind = (mimetype = "") =>
  mimetype.startsWith("image/") ? "image" : mimetype.startsWith("video/") ? "video" : "file";

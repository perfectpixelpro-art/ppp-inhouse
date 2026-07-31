import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Uploads STREAM TO DISK, never buffered in RAM, so a big upload can't exhaust
// the server's memory. Stored under UPLOAD_DIR and served from /uploads.
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  if (/^image\/(png|jpe?g|webp|gif|heic|heif)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only image files are allowed"));
};

export const uploadImage = multer({
  storage: diskStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB images — streamed to disk
});

// Broader upload for review submissions: images, video, PDF, Office docs, text.
const attachmentFilter = (req, file, cb) => {
  const ok =
    /^(image|video)\//.test(file.mimetype) ||
    /(pdf|msword|officedocument|ms-excel|ms-powerpoint|text\/|zip|csv)/.test(file.mimetype);
  cb(ok ? null : new Error("Unsupported file type"), ok);
};

export const uploadAttachment = multer({
  storage: diskStorage,
  fileFilter: attachmentFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB (videos) — streamed to disk
});

// Rough bucket for the frontend to render (thumbnail / player / link).
export const fileKind = (mimetype = "") =>
  mimetype.startsWith("image/") ? "image" : mimetype.startsWith("video/") ? "video" : "file";

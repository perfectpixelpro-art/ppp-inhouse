import { v2 as cloudinary } from "cloudinary";

// Env is read lazily (dotenv.config() runs after imports in server.js).
export const cloudinaryConfigured = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const configure = () =>
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

// Upload an in-memory image buffer, resolve to the hosted https URL.
export const uploadBuffer = (buffer, folder = "ppp") =>
  new Promise((resolve, reject) => {
    configure();
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });

// Upload any file (image / video / pdf / doc) — resource_type "auto" lets
// Cloudinary handle non-image types (videos, raw files).
export const uploadBufferAuto = (buffer, folder = "ppp") =>
  new Promise((resolve, reject) => {
    configure();
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });

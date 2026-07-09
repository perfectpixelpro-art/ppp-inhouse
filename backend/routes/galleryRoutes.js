import { Router } from "express";
import {
  getGallery,
  createGalleryItem,
  deleteGalleryItem,
} from "../controllers/galleryController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, getGallery);
router.post("/", protect, authorize("admin", "hr"), createGalleryItem);
router.delete("/:id", protect, authorize("admin", "hr"), deleteGalleryItem);

export default router;

import { Router } from "express";
import { createNotice, listNotices, deleteNotice, myNotices, ackNotice } from "../controllers/noticeController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/mine", protect, myNotices);
router.post("/:id/ack", protect, ackNotice);

router.get("/", protect, authorize("admin", "hr"), listNotices);
router.post("/", protect, authorize("admin", "hr"), createNotice);
router.delete("/:id", protect, authorize("admin", "hr"), deleteNotice);

export default router;

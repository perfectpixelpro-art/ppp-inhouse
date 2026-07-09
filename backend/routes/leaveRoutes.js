import { Router } from "express";
import {
  getLeaves,
  getLeaveBalance,
  createLeave,
  updateLeaveStatus,
} from "../controllers/leaveController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect, authorize("admin", "hr"));

router.get("/balance", getLeaveBalance);
router.route("/").get(getLeaves).post(createLeave);
router.patch("/:id/status", updateLeaveStatus);

export default router;

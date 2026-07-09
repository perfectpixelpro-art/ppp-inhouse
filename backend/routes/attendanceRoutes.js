import { Router } from "express";
import {
  getAttendance,
  upsertAttendance,
} from "../controllers/attendanceController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect, authorize("admin", "hr"));

router.route("/").get(getAttendance).post(upsertAttendance);

export default router;

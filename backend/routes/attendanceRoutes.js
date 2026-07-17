import { Router } from "express";
import {
  getAttendance,
  upsertAttendance,
  editAttendance,
} from "../controllers/attendanceController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect, authorize("admin", "hr"));

router.route("/").get(getAttendance).post(upsertAttendance);
router.patch("/:id", editAttendance);

export default router;

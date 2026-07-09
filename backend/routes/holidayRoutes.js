import { Router } from "express";
import {
  getHolidays,
  createHoliday,
  deleteHoliday,
} from "../controllers/holidayController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// Any authenticated user (incl. employees) can read holidays;
// only admin/HR can create or delete them.
router.get("/", protect, getHolidays);
router.post("/", protect, authorize("admin", "hr"), createHoliday);
router.delete("/:id", protect, authorize("admin", "hr"), deleteHoliday);

export default router;

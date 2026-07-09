import { Router } from "express";
import {
  myAttendance,
  myToday,
  checkIn,
  checkOut,
  saveDsr,
  markRain,
  myLeaves,
  applyLeave,
  attachLeaveDoc,
  updateMyProfile,
} from "../controllers/meController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Any authenticated user; all actions are scoped to req.user
router.use(protect);

router.patch("/profile", updateMyProfile);

router.get("/attendance", myAttendance);
router.get("/attendance/today", myToday);
router.post("/attendance/checkin", checkIn);
router.post("/attendance/checkout", checkOut);
router.post("/attendance/dsr", saveDsr);
router.post("/attendance/rain", markRain);

router.get("/leaves", myLeaves);
router.post("/leaves", applyLeave);
router.post("/leaves/:id/attachment", attachLeaveDoc);

export default router;

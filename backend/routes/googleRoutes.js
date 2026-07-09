import { Router } from "express";
import { status, auth, callback, syncAttendance, syncHolidaysCalendar, importHolidaysCalendar } from "../controllers/googleController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// Browser OAuth flow (one-time). Left open — only useful for our OAuth client.
router.get("/auth", auth);
router.get("/oauth2callback", callback);

// App endpoints
router.get("/status", protect, status);
router.post("/sync/attendance", protect, authorize("admin", "hr"), syncAttendance);
router.post("/sync/holidays", protect, authorize("admin", "hr"), syncHolidaysCalendar);
router.post("/import/holidays", protect, authorize("admin", "hr"), importHolidaysCalendar);

export default router;

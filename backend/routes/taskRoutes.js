import { Router } from "express";
import {
  assignableUsers,
  myTasks,
  assignedByMe,
  createTask,
  updateStatus,
  deleteTask,
} from "../controllers/taskController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Any authenticated user — anyone can assign to anyone.
router.use(protect);

router.get("/assignable", assignableUsers);
router.get("/mine", myTasks);
router.get("/assigned", assignedByMe);
router.post("/", createTask);
router.patch("/:id/status", updateStatus);
router.delete("/:id", deleteTask);

export default router;

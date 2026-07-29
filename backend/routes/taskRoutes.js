import { Router } from "express";
import {
  assignableUsers,
  myTasks,
  allTasks,
  assignedByMe,
  projectTasks,
  portfolio,
  createTask,
  updateTask,
  updateStatus,
  deleteTask,
} from "../controllers/taskController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Any authenticated user — anyone can assign to anyone.
router.use(protect);

router.get("/assignable", assignableUsers);
router.get("/mine", myTasks);
router.get("/all", allTasks);
router.get("/assigned", assignedByMe);
router.get("/portfolio", portfolio);
router.get("/", projectTasks); // ?project=:id — tasks in a project
router.post("/", createTask);
router.patch("/:id/status", updateStatus);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);

export default router;

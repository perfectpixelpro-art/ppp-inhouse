import { Router } from "express";
import {
  listProjects,
  createProject,
  getProject,
  projectStats,
  projectAssets,
  listResources,
  addResource,
  removeResource,
  updateProject,
  deleteProject,
} from "../controllers/projectController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Any authenticated user — anyone can create projects and be a member.
router.use(protect);

router.route("/").get(listProjects).post(createProject);
router.get("/:id/stats", projectStats);
router.get("/:id/assets", projectAssets);
router.get("/:id/resources", listResources);
router.post("/:id/resources", addResource);
router.delete("/:id/resources/:resId", removeResource);
router.route("/:id").get(getProject).put(updateProject).delete(deleteProject);

export default router;

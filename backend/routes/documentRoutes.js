import { Router } from "express";
import {
  getDocuments,
  createDocument,
  deleteDocument,
} from "../controllers/documentController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect, authorize("admin", "hr"));

router.route("/").get(getDocuments).post(createDocument);
router.delete("/:id", deleteDocument);

export default router;

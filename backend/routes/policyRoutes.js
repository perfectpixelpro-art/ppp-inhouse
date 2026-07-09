import { Router } from "express";
import Policy from "../models/Policy.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// GET /api/policy — any authenticated user reads the company policy
router.get("/", protect, async (req, res) => {
  const doc = (await Policy.findOne()) || (await Policy.create({}));
  res.json(doc);
});

// PUT /api/policy — admin/hr edits it
router.put("/", protect, authorize("admin", "hr"), async (req, res) => {
  const doc = (await Policy.findOne()) || new Policy();
  doc.content = req.body.content || "";
  await doc.save();
  res.json(doc);
});

export default router;

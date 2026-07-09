import { Router } from "express";
import {
  getExpenses,
  createExpense,
  deleteExpense,
} from "../controllers/expenseController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect, authorize("admin", "hr"));

router.route("/").get(getExpenses).post(createExpense);
router.delete("/:id", deleteExpense);

export default router;

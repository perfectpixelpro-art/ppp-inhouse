import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import holidayRoutes from "./routes/holidayRoutes.js";
import meRoutes from "./routes/meRoutes.js";
import galleryRoutes from "./routes/galleryRoutes.js";
import slackRoutes from "./routes/slackRoutes.js";
import googleRoutes from "./routes/googleRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import policyRoutes from "./routes/policyRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";
import { UPLOAD_DIR } from "./middleware/upload.js";
import { startScheduler } from "./scheduler.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "PPP backend", db: "PPP" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/me", meRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/slack", slackRoutes);
// Alias: Slack's Interactivity Request URL posts the bare root — route it to the
// same handler (only POST /; the GET / health check above is unaffected).
app.use("/", slackRoutes);
app.use("/api/google", googleRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/policy", policyRoutes);
app.use("/api/notices", noticeRoutes);

// Serve uploaded images
app.use("/uploads", express.static(UPLOAD_DIR));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  startScheduler();
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});

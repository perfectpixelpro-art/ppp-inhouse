import crypto from "crypto";
import User from "../models/User.js";
import { generateToken } from "../utils/token.js";
import { sendMail } from "../services/mail.js";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");
const CONTACT_MSG = "Please contact HR or Admin to change your password.";

// POST /api/auth/login
export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  if (!user.active) {
    return res.status(403).json({ message: "Account is disabled" });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    },
  });
};

// GET /api/auth/me
export const me = async (req, res) => {
  res.json({ user: req.user });
};

// POST /api/auth/forgot-password  { email }
// Self-service reset is admin/HR only. Employees (and unknown emails, so we don't
// reveal who exists) are told to contact HR instead.
export const forgotPassword = async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "Email is required" });

  const user = await User.findOne({ email, active: true });
  if (!user || !["admin", "hr"].includes(user.role)) {
    return res.json({ sent: false, message: CONTACT_MSG });
  }

  const token = crypto.randomBytes(32).toString("hex");
  user.resetTokenHash = hashToken(token);
  user.resetTokenExpires = new Date(Date.now() + RESET_TTL_MS);
  await user.save({ validateBeforeSave: false });

  const link = `${process.env.CLIENT_URL}/reset-password/${token}`;
  await sendMail({
    to: user.email,
    subject: "Reset your PPP password",
    html: `<p>Hi ${user.name},</p>
           <p>Click below to set a new password. The link expires in 1 hour and can be used once.</p>
           <p><a href="${link}">Reset my password</a></p>
           <p style="color:#666;font-size:12px">If you didn't request this, ignore this email — your password stays unchanged.</p>`,
  });

  res.json({ sent: true, message: `Reset link sent to ${user.email}. Check your inbox.` });
};

// POST /api/auth/reset-password  { token, password }
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: "Token and password are required" });
  if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });

  const user = await User.findOne({
    resetTokenHash: hashToken(token),
    resetTokenExpires: { $gt: new Date() },
  }).select("+resetTokenHash +resetTokenExpires +password");

  if (!user) return res.status(400).json({ message: "This reset link is invalid or has expired." });

  user.password = password; // re-hashed by the pre-save hook
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  res.json({ message: "Password updated. You can sign in now." });
};

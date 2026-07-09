import User from "../models/User.js";

// Thin wrapper over Resend's REST API — no SDK, just fetch (Node 18+).
// Fire-and-forget: mail failures are logged, never block the request.
// Env is read lazily (inside the fn): server.js calls dotenv.config() *after*
// importing this module, so reading at top level would capture undefined.
export const sendMail = async ({ to, subject, html }) => {
  const KEY = process.env.RESEND_API_KEY;
  const FROM = process.env.MAIL_FROM || "PPP HR <noreply@perfectpixelpro.app>";
  if (!KEY) return console.warn("[mail] RESEND_API_KEY not set — skipping:", subject);
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: recipients, subject, html }),
    });
    if (!res.ok) console.error("[mail] failed:", res.status, await res.text());
  } catch (e) {
    console.error("[mail] error:", e.message);
  }
};

// Emails of everyone who should get HR notifications (admins + HR).
export const staffEmails = async () => {
  const staff = await User.find({ role: { $in: ["admin", "hr"] }, active: true }).select("email");
  return staff.map((u) => u.email).filter(Boolean);
};

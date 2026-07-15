import cron from "node-cron";
import Attendance from "./models/Attendance.js";
import User from "./models/User.js";
import { hardStopAll } from "./services/attendanceHardStop.js";
import { lunchStopAll } from "./services/attendanceLunch.js";
import { postShiftCheck } from "./services/slack.js";
import { syncMonth } from "./controllers/googleController.js";
import { isAuthorized } from "./services/googleSheets.js";
import { sendMail, staffEmails } from "./services/mail.js";

const IST = { timezone: "Asia/Kolkata" };

// Email HR each morning about today's birthdays and work anniversaries.
const mmdd = (d) => { const x = new Date(d); return `${x.getMonth() + 1}-${x.getDate()}`; };
export const sendBirthdayAnniversary = async () => {
  const today = new Date();
  const key = `${today.getMonth() + 1}-${today.getDate()}`;
  const users = await User.find({ active: true }).select("name birthdate joinDate");
  const to = await staffEmails();
  if (!to.length) return;
  for (const u of users) {
    if (u.birthdate && mmdd(u.birthdate) === key) {
      await sendMail({ to, subject: `🎂 Birthday today — ${u.name}`, html: `<p>It's <strong>${u.name}</strong>'s birthday today. 🎉</p>` });
    }
    if (u.joinDate && mmdd(u.joinDate) === key) {
      const years = today.getFullYear() - new Date(u.joinDate).getFullYear();
      if (years > 0)
        await sendMail({ to, subject: `🎉 Work anniversary — ${u.name} (${years} yr)`, html: `<p><strong>${u.name}</strong> completes <strong>${years} year${years === 1 ? "" : "s"}</strong> today. 🎊</p>` });
    }
  }
};

// Current time as "HH:MM" in IST — matches User.reminderTimesIST entries.
const istHHMM = (ms = Date.now()) =>
  new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });

// Runs every 5 min in the evening. For each still-working full-day employee, sends
// a Slack shift-check if the current time matches one of THEIR reminder times, then
// force-closes anyone whose per-employee shift cap has arrived. Per-person schedule
// lives on the User (reminderTimesIST / shiftCapIST).
export const eveningTick = async (nowMs = Date.now()) => {
  const now = istHHMM(nowMs);
  const date = new Date(nowMs).toISOString().slice(0, 10);

  const working = await Attendance.find({ date, dayType: "full", state: "working" })
    .populate("employee", "name slackUserId reminderTimesIST");
  let sent = 0;
  for (const r of working) {
    const times = r.employee?.reminderTimesIST || [];
    if (times.includes(now)) {
      const res = await postShiftCheck({ employee: r.employee, attendance: r });
      if (res?.ok) sent++;
    }
  }

  const closed = await hardStopAll(nowMs); // closes anyone past their own cap
  if (sent || closed) console.log(`[scheduler] evening tick ${now} — ${sent} reminder(s), ${closed} auto-closed`);
  return { sent, closed };
};

// Registers all recurring background jobs.
export const startScheduler = () => {
  // Per-employee shift reminders + caps — every 5 min through the evening window.
  // Each person's reminder times and cap live on their User record.
  cron.schedule("*/5 20-21 * * *", () => eveningTick().catch((e) => console.error("[scheduler] evening tick failed:", e.message)), IST);

  // 2:00 PM — auto-pause open full-day timers for lunch
  cron.schedule(
    "0 14 * * *",
    async () => {
      try {
        const paused = await lunchStopAll();
        console.log(`[scheduler] 2 PM lunch — paused ${paused} timer(s)`);
      } catch (err) {
        console.error("[scheduler] lunch stop failed:", err.message);
      }
    },
    IST
  );

  // 9:05 PM — backstop in case a late cap (e.g. 9 PM) slipped the evening tick
  cron.schedule(
    "5 21 * * *",
    () => hardStopAll().then((n) => n && console.log(`[scheduler] 9:05 PM backstop — closed ${n}`)).catch((e) => console.error("[scheduler] backstop failed:", e.message)),
    IST
  );

  // 10:00 PM — auto-sync the current month's attendance to the live Google Sheet
  cron.schedule(
    "0 22 * * *",
    async () => {
      if (!isAuthorized()) {
        console.log("[scheduler] 10 PM Google sync skipped — not connected");
        return;
      }
      try {
        const { rows, url } = await syncMonth();
        console.log(`[scheduler] 10 PM Google sync — ${rows} rows → ${url}`);
      } catch (err) {
        console.error("[scheduler] Google sync failed:", err.message);
      }
    },
    IST
  );

  // 9:00 AM — birthday & work-anniversary emails to HR
  cron.schedule(
    "0 9 * * *",
    async () => {
      try {
        await sendBirthdayAnniversary();
      } catch (err) {
        console.error("[scheduler] birthday/anniversary mail failed:", err.message);
      }
    },
    IST
  );

  console.log("[scheduler] per-employee shift reminders/caps + 2 PM lunch + 10 PM Google sync + 9 AM birthday mail scheduled (Asia/Kolkata)");
};

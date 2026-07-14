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

// Send a Slack shift-check to everyone still actively working (full day).
// "No" ends their day; "Yes" continues; ignored → they get the next reminder.
export const sendShiftReminders = async () => {
  const date = new Date().toISOString().slice(0, 10);
  const records = await Attendance.find({ date, dayType: "full", state: "working" })
    .populate("employee", "name slackUserId");
  let sent = 0;
  for (const r of records) {
    if (!r.employee) continue;
    const res = await postShiftCheck({ employee: r.employee, attendance: r });
    if (res?.ok) sent++;
  }
  console.log(`[scheduler] shift reminders sent: ${sent}/${records.length}`);
  return sent;
};

// Registers all recurring background jobs.
export const startScheduler = () => {
  // Escalating shift-check reminders (IST)
  cron.schedule("15 20 * * *", sendShiftReminders, IST); // 8:15 PM
  cron.schedule("20 20 * * *", sendShiftReminders, IST); // 8:20 PM
  cron.schedule("25 20 * * *", sendShiftReminders, IST); // 8:25 PM

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

  // 8:30 PM — force-close any open full-day shift (final backstop)
  cron.schedule(
    "30 20 * * *",
    async () => {
      try {
        const closed = await hardStopAll();
        console.log(`[scheduler] 8:30 PM hard stop — closed ${closed} open full-day record(s)`);
      } catch (err) {
        console.error("[scheduler] hard stop failed:", err.message);
      }
    },
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

  console.log("[scheduler] Slack reminders + 8:30 hard stop + 10 PM Google sync + 9 AM birthday mail scheduled (Asia/Kolkata)");
};

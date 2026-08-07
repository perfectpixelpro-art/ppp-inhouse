import cron from "node-cron";
import Attendance from "./models/Attendance.js";
import User from "./models/User.js";
import Holiday from "./models/Holiday.js";
import Leave from "./models/Leave.js";
import Task from "./models/Task.js";
import Project from "./models/Project.js"; // ensure the model is registered for populate
import { CLOSED_STATUSES } from "./models/Task.js";
import { hardStopAll } from "./services/attendanceHardStop.js";
import { lunchStopAll } from "./services/attendanceLunch.js";
import { remindLongBreaks, remindLunchNotResumed } from "./services/attendanceBreakReminder.js";
import { postShiftCheck, postToChannel } from "./services/slack.js";
import { syncMonth } from "./controllers/googleController.js";
import { isAuthorized } from "./services/googleSheets.js";
import { sendMail, staffEmails } from "./services/mail.js";
import { celebrationEmail, taskSummaryEmail } from "./services/emailTemplates.js";

const IST = { timezone: "Asia/Kolkata" };

// Resend allows 2 emails/sec — pause between bulk sends so none are rejected (429).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAIL_GAP_MS = 600; // ~1.6 emails/sec, safely under the limit

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
      await sendMail({
        to, subject: `🎂 Birthday today — ${u.name}`,
        html: celebrationEmail({
          name: u.name, label: "Birthday",
          headline: `🎂 It's ${u.name}'s birthday!`,
          message: "take a moment to wish them a great day",
          detail: "Birthday today",
        }),
      });
    }
    if (u.joinDate && mmdd(u.joinDate) === key) {
      const years = today.getFullYear() - new Date(u.joinDate).getFullYear();
      if (years > 0)
        await sendMail({
          to, subject: `🎉 Work anniversary — ${u.name} (${years} yr)`,
          html: celebrationEmail({
            name: u.name, label: "Work Anniversary",
            headline: `🎉 ${u.name}'s ${years}-year work anniversary`,
            message: `celebrate ${years} year${years === 1 ? "" : "s"} at Perfect Pixel Pro`,
            detail: `${years} year${years === 1 ? "" : "s"} today`,
          }),
        });
    }
  }
};

// 9 PM — email each employee a summary of their tasks: status, worked time,
// review time and the latest review feedback.
const STATUS_TXT = { todo: "To-do", in_progress: "In progress", in_review: "In review", approved: "Approved", done: "Done" };
const msToHm = (ms) => {
  const m = Math.round((ms || 0) / 60000);
  if (!m) return "—";
  const h = Math.floor(m / 60), mm = m % 60;
  return h ? (mm ? `${h}h ${mm}m` : `${h}h`) : `${mm}m`;
};
const dmy = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" }) : "—");

export const sendDailyTaskDigest = async () => {
  const employees = await User.find({ active: true, role: { $in: ["employee", "project_manager"] } }).select("name email");
  let sent = 0;
  for (const u of employees) {
    if (!u.email) continue;
    const tasks = await Task.find({ $or: [{ assignedTo: u._id }, { coAssignees: u._id }] })
      .populate("projectId", "name")
      .sort({ status: 1, dueDate: 1 });
    if (!tasks.length) continue;

    const rows = tasks.map((t) => {
      const worked = t.activeMs ? msToHm(t.activeMs) : t.startedAt && !CLOSED_STATUSES.includes(t.status) ? "In progress" : "—";
      const lastChange = [...t.comments].reverse().find((c) => (c.text || "").startsWith("🔁"));
      const feedback = lastChange ? lastChange.text.replace("🔁 Changes requested: ", "") : t.reviewedBy ? "Reviewed" : "—";
      return {
        status: t.status, statusLabel: STATUS_TXT[t.status] || t.status,
        project: t.projectId?.name || "—", due: dmy(t.dueDate),
        timeTaken: worked, reviewTime: msToHm(t.reviewMs), feedback,
      };
    });

    const html = taskSummaryEmail({
      name: u.name,
      summaryDate: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }),
      rows,
    });
    await sendMail({ to: u.email, subject: `📋 Your daily task summary`, html });
    sent++;
    await sleep(MAIL_GAP_MS); // throttle so Resend (2/sec) doesn't reject the batch
  }
  console.log(`[scheduler] 9 PM task digest — emailed ${sent} employee(s)`);
  return sent;
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

// Off days: Sunday, EVEN Saturday (2nd/4th), national holiday. Mirrors payroll.js.
const isWorkingDay = async (d) => {
  const dow = d.getDay();
  if (dow === 0) return false;
  if (dow === 6 && Math.ceil(d.getDate() / 7) % 2 === 0) return false;
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return !(await Holiday.findOne({ type: "national", date: { $gte: start, $lt: end } }));
};

// Mid-afternoon nudge: who still hasn't checked in today?
export const notCheckedInPing = async (now = new Date()) => {
  if (!(await isWorkingDay(now))) return 0;
  const date = now.toISOString().slice(0, 10);

  const [staff, punched, onLeave] = await Promise.all([
    User.find({ role: "employee", active: true }).select("name slackUserId"),
    Attendance.find({ date, checkIn: { $ne: null } }).select("employee"),
    Leave.find({ status: "approved", fromDate: { $lte: now }, toDate: { $gte: now } }).select("employee"),
  ]);

  const skip = new Set([...punched, ...onLeave].map((r) => String(r.employee)));
  const missing = staff.filter((e) => !skip.has(String(e._id)));
  if (!missing.length) return 0;

  const who = missing.map((e) => (e.slackUserId ? `<@${e.slackUserId}>` : e.name)).join(" ");
  await postToChannel(`:alarm_clock: ${who} — you haven't checked in yet today. Please mark your check-in in the PPP portal.`);
  console.log(`[scheduler] 3:10 PM check-in reminder — pinged ${missing.length}`);
  return missing.length;
};

// Registers all recurring background jobs.
export const startScheduler = () => {
  // Every 5 min — two independent nudges, both keyed off the record's live state
  // so they can't overlap (see services/attendanceBreakReminder.js):
  //   • SHORT break open past 10 min  → resume-after-break ping
  //   • still on_lunch after the 2–3 PM window closes (~3 PM) → resume-after-lunch ping
  // Running lunch on the recurring cron (not a single 3:10 PM shot) means the ping
  // still goes out if any one tick is missed; the per-break `remindedAt` guard
  // stops it from re-pinging the same break.
  cron.schedule(
    "*/5 * * * *",
    async () => {
      try {
        const [brk, lunch] = await Promise.all([remindLongBreaks(), remindLunchNotResumed()]);
        if (brk) console.log(`[scheduler] break reminder — pinged ${brk}`);
        if (lunch) console.log(`[scheduler] lunch reminder — pinged ${lunch}`);
      } catch (e) {
        console.error("[scheduler] break/lunch reminder failed:", e.message);
      }
    },
    IST
  );

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

  // 9:00 PM — email each employee their daily task summary
  cron.schedule(
    "0 21 * * *",
    () => sendDailyTaskDigest().catch((e) => console.error("[scheduler] task digest failed:", e.message)),
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

  console.log("[scheduler] shift reminders/caps + 2 PM lunch + 15-min break nudge + 3:10 PM pings + 9 PM task digest + 10 PM Google sync + 9 AM birthday mail scheduled (Asia/Kolkata)");
};

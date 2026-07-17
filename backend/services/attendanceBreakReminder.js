import Attendance from "../models/Attendance.js";
import { postToChannel } from "./slack.js";
import { lunchEndInstant } from "./attendanceLunch.js";

// Nudges for a timer left paused. Two separate cases, deliberately keyed off the
// record's state so they can't overlap:
//   - on_break  → a SHORT break that has run past 15 min (checked every 5 min)
//   - on_lunch  → lunch (a fixed 2–3 PM window) not resumed by the 3:10 PM check
// A lunch break must never trip the 15-min rule, or every lunch would fire at 2:15.
export const BREAK_GRACE_MS = 15 * 60000;

// Break notices share the short-break channel; postToChannel falls back to the
// main HR/admin channel when SLACK_BREAK_CHANNEL_ID isn't configured.
const breakChannel = () => process.env.SLACK_BREAK_CHANNEL_ID;

const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
const mention = (e) => (e?.slackUserId ? `<@${e.slackUserId}>` : `*${e?.name || "Someone"}*`);

// The still-open break at the tail of the list, if any.
export const openBreak = (record) => {
  const last = (record?.breaks || [])[record.breaks.length - 1];
  return last && !last.end ? last : null;
};

// Has this short break run past the grace period without us nudging yet?
// `nowMs` is injectable so the behaviour is deterministic in tests.
export const breakReminderDue = (record, nowMs = Date.now()) => {
  if (!record || record.state !== "on_break") return false;
  const b = openBreak(record);
  if (!b || b.type !== "break" || b.remindedAt) return false;
  return nowMs - new Date(b.start).getTime() >= BREAK_GRACE_MS;
};

// Lunch is over but the timer is still paused, and we haven't nudged yet.
export const lunchReminderDue = (record, nowMs = Date.now()) => {
  if (!record || record.state !== "on_lunch") return false;
  const b = openBreak(record);
  if (b?.remindedAt) return false;
  return nowMs >= lunchEndInstant(record.date).getTime();
};

// Ping anyone whose SHORT break has run past 15 min. Run by the 5-min cron.
export const remindLongBreaks = async (nowMs = Date.now()) => {
  const records = await Attendance.find({ date: ymd(nowMs), state: "on_break" })
    .populate("employee", "name slackUserId");
  let sent = 0;
  for (const r of records) {
    if (!breakReminderDue(r, nowMs)) continue;
    const b = openBreak(r);
    const mins = Math.round((nowMs - new Date(b.start).getTime()) / 60000);
    await postToChannel(
      `:hourglass_flowing_sand: ${mention(r.employee)} — you've been on a short break for *${mins} min* and your timer is still paused. Resume it in the PPP portal when you're back.`,
      breakChannel()
    );
    b.remindedAt = new Date(nowMs);
    await r.save();
    sent++;
  }
  return sent;
};

// Ping anyone still on lunch after the 2–3 PM window. Run by the 3:10 PM cron.
export const remindLunchNotResumed = async (nowMs = Date.now()) => {
  const records = await Attendance.find({ date: ymd(nowMs), state: "on_lunch" })
    .populate("employee", "name slackUserId");
  let sent = 0;
  for (const r of records) {
    if (!lunchReminderDue(r, nowMs)) continue;
    await postToChannel(
      `:fork_and_knife: ${mention(r.employee)} — lunch ended at *3:00 PM* and your timer is still paused. Resume it in the PPP portal.`,
      breakChannel()
    );
    const b = openBreak(r);
    if (b) b.remindedAt = new Date(nowMs);
    await r.save();
    sent++;
  }
  return sent;
};

// self-check: node services/attendanceBreakReminder.js  (fake records, no DB)
if (import.meta.url === `file://${process.argv[1]}`) {
  const at = (utc) => new Date(`2026-07-15T${utc}Z`).getTime();
  const ok = (c, m) => console.assert(c, m);
  const mk = (o = {}) => ({ date: "2026-07-15", breaks: [], ...o });
  const brk = (o = {}) => ({ type: "break", start: new Date(at("06:00:00")), ...o });

  // --- short break, 15-min grace (break started 11:30 IST == 06:00 UTC) ---
  ok(!breakReminderDue(mk({ state: "on_break", breaks: [brk()] }), at("06:10:00")), "10 min in → no nudge");
  ok(breakReminderDue(mk({ state: "on_break", breaks: [brk()] }), at("06:15:00")), "exactly 15 min → nudge");
  ok(breakReminderDue(mk({ state: "on_break", breaks: [brk()] }), at("06:40:00")), "40 min in → nudge");
  ok(!breakReminderDue(mk({ state: "on_break", breaks: [brk({ remindedAt: new Date() })] }), at("06:40:00")), "already nudged → no repeat");
  ok(!breakReminderDue(mk({ state: "working", breaks: [brk({ end: new Date(at("06:05:00")) })] }), at("06:40:00")), "resumed → no nudge");
  ok(!breakReminderDue(mk({ state: "not_started" }), at("06:40:00")), "no breaks → no nudge");

  // a LUNCH break must never trip the 15-min rule — that's the 3:10 PM job's business
  ok(!breakReminderDue(mk({ state: "on_lunch", breaks: [{ type: "lunch", start: new Date(at("08:30:00")) }] }), at("08:45:00")),
     "lunch at 2:15 PM must NOT fire the 15-min break rule");

  // --- lunch not resumed (lunch window 2–3 PM == 08:30–09:30 UTC) ---
  const onLunch = (o = {}) => mk({ state: "on_lunch", breaks: [{ type: "lunch", start: new Date(at("08:30:00")), ...o }] });
  ok(!lunchReminderDue(onLunch(), at("09:00:00")), "2:30 PM, lunch still running → no nudge");
  ok(!lunchReminderDue(onLunch(), at("09:29:00")), "2:59 PM → no nudge");
  ok(lunchReminderDue(onLunch(), at("09:40:00")), "3:10 PM still on lunch → nudge");
  ok(!lunchReminderDue(onLunch({ remindedAt: new Date() }), at("09:40:00")), "already nudged → no repeat");
  ok(!lunchReminderDue(mk({ state: "working" }), at("09:40:00")), "resumed by 3:10 → no nudge");
  ok(!lunchReminderDue(mk({ state: "on_break", breaks: [brk()] }), at("09:40:00")), "short break is not lunch → no lunch nudge");

  console.log("attendanceBreakReminder self-check done");
}

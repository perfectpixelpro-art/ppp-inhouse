import Attendance from "../models/Attendance.js";
import { verifySlackSignature, respondVia } from "../services/slack.js";

const timeIST = () =>
  new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

// POST /api/slack/interactions  — Slack Yes/No button clicks land here
export const interactions = async (req, res) => {
  if (!verifySlackSignature(req)) {
    return res.status(401).send("invalid signature");
  }

  let payload;
  try {
    payload = JSON.parse(req.body.payload);
  } catch {
    return res.status(400).send("bad payload");
  }

  // Acknowledge immediately (Slack needs a 200 within 3s)
  res.status(200).send("");

  const action = payload.actions?.[0];
  const responseUrl = payload.response_url;
  if (!action) return;

  let data = {};
  try { data = JSON.parse(action.value); } catch { /* ignore */ }

  const clickerId = payload.user?.id;

  // Enforce "only the named person may answer" when we know their Slack id
  if (data.u && clickerId && data.u !== clickerId) {
    await respondVia(responseUrl, {
      response_type: "ephemeral",
      replace_original: false,
      text: ":warning: This shift check isn't for you.",
    });
    return;
  }

  const record = await Attendance.findById(data.a);
  if (!record) {
    await respondVia(responseUrl, { replace_original: true, text: "This attendance record no longer exists." });
    return;
  }

  if (record.state === "ended") {
    await respondVia(responseUrl, { replace_original: true, text: ":checkered_flag: This day is already closed." });
    return;
  }

  if (data.ans === "no") {
    // Stop the timer now — end the day
    if (record.state === "working" && record.currentStart) {
      record.workedMs += Date.now() - new Date(record.currentStart).getTime();
    }
    record.currentStart = null;
    record.state = "ended";
    record.checkOut = new Date();
    record.note = "Ended via Slack (not working)";
    await record.save();
    await respondVia(responseUrl, {
      replace_original: true,
      text: `:stop_sign: Marked *done for the day* at ${timeIST()}. Your timer has stopped — don't forget to fill your DSR.`,
    });
  } else {
    await respondVia(responseUrl, {
      replace_original: true,
      text: `:white_check_mark: Thanks — marked *still working*. Timer continues (auto-stops at 8:30 PM).`,
    });
  }
};

import crypto from "crypto";

const SLACK_API = "https://slack.com/api";

// Post a shift-check message (with Yes/No buttons) to the configured channel.
// The button value carries the attendance id + the employee's Slack id so the
// interactions handler can act and enforce "only that person may answer".
export const postShiftCheck = async ({ employee, attendance }) => {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;
  if (!token || !channel) return { ok: false, error: "slack_not_configured" };

  const base = { a: String(attendance._id), u: employee.slackUserId || "" };
  const mention = employee.slackUserId ? `<@${employee.slackUserId}>` : `*${employee.name}*`;

  const body = {
    channel,
    text: `Attendance check for ${employee.name}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:clock8: *Shift check* — Hi ${mention}, it's past 8 PM and your timer is still running. Are you still working?`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "✅ Yes, still working", emoji: true },
            style: "primary",
            action_id: "attendance_yes",
            value: JSON.stringify({ ...base, ans: "yes" }),
          },
          {
            type: "button",
            text: { type: "plain_text", text: "🛑 No, I'm done", emoji: true },
            style: "danger",
            action_id: "attendance_no",
            value: JSON.stringify({ ...base, ans: "no" }),
          },
        ],
      },
    ],
  };

  const r = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
};

// Post a plain message to a channel (defaults to the main HR/admin one).
// Fire-and-forget — never blocks the request; failures are logged, not thrown.
export const postToChannel = async (text, channelId) => {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = channelId || process.env.SLACK_CHANNEL_ID;
  if (!token || !channel) return console.warn("[slack] not configured — skipping:", text);
  try {
    const r = await fetch(`${SLACK_API}/chat.postMessage`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel, text }),
    });
    const data = await r.json();
    if (!data.ok) console.error("[slack] postMessage failed:", data.error);
  } catch (e) {
    console.error("[slack] postMessage error:", e.message);
  }
};

// Verify the request genuinely came from Slack (signing-secret HMAC + replay guard).
export const verifySlackSignature = (req) => {
  const secret = process.env.SLACK_SIGNING_SECRET;
  const ts = req.headers["x-slack-request-timestamp"];
  const sig = req.headers["x-slack-signature"];
  if (!secret || !ts || !sig || req.rawBody == null) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false; // >5 min → reject

  const base = `v0:${ts}:${req.rawBody}`;
  const mine = "v0=" + crypto.createHmac("sha256", secret).update(base).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(mine), Buffer.from(sig));
  } catch {
    return false;
  }
};

// Update / reply to the interactive message using Slack's response_url.
export const respondVia = async (responseUrl, message) => {
  if (!responseUrl) return;
  await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
};

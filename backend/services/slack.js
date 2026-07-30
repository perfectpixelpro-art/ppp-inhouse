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

// Channel where new task assignments are announced (daily-task-report style).
const taskChannel = () => process.env.SLACK_TASK_CHANNEL_ID || "C06H1SNM01M";

const fmtDue = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

// Announce new task assignments to the task-report channel, grouped by assignee
// with an @mention (when we know their Slack id). Fire-and-forget.
//   items: [{ title, projectName, dueDate, assignee: { name, slackUserId } }]
export const notifyTaskAssignment = async ({ assignerName, items }) => {
  if (!items?.length) return;
  const groups = new Map();
  for (const it of items) {
    const key = String(it.assignee?.slackUserId || it.assignee?.name || "someone");
    if (!groups.has(key)) groups.set(key, { assignee: it.assignee, list: [] });
    groups.get(key).list.push(it);
  }

  const n = items.length;
  let text = `:memo: *${n} new task${n === 1 ? "" : "s"} assigned* by ${assignerName || "HR"}\n`;
  for (const { assignee, list } of groups.values()) {
    const mention = assignee?.slackUserId ? `<@${assignee.slackUserId}>` : `*${assignee?.name || "Someone"}*`;
    text += `\n${mention}\n`;
    for (const it of list) {
      const meta = [it.projectName, it.dueDate ? `due ${fmtDue(it.dueDate)}` : null].filter(Boolean).join(" · ");
      text += `• ${it.title}${meta ? `  _(${meta})_` : ""}\n`;
    }
  }
  await postToChannel(text, taskChannel());
};

// Default reviewer tags (overridable via env). Their Slack member ids.
export const SLACK_HR_ID = () => process.env.SLACK_HR_ID || "U06H5PZGZ8X";
export const SLACK_ADMIN_ID = () => process.env.SLACK_ADMIN_ID || "U06H61TF0CX";

const nowIST = () =>
  new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

// A task was started — posted to the project's own Slack channel.
export const notifyTaskStart = async ({ channelId, userName, taskTitle }) =>
  postToChannel(`:large_green_circle: *${userName}* started *${taskTitle}* at *${nowIST()}*`, channelId);

// A task was completed — posted to the project's own Slack channel.
export const notifyTaskComplete = async ({ channelId, userName, taskTitle }) =>
  postToChannel(`:white_check_mark: *${userName}* completed *${taskTitle}* at *${nowIST()}*`, channelId);

// A task was approved (and auto-marked done) — posted to the project channel.
export const notifyApproved = async ({ channelId, approverName, taskTitle, assigneeSlackId }) => {
  const who = assigneeSlackId ? ` ${`<@${assigneeSlackId}>`}` : "";
  await postToChannel(`:ballot_box_with_check: *${taskTitle}* approved & marked *done* by *${approverName}* at *${nowIST()}*${who}`, channelId);
};

// A reviewer requested changes — posted to the project channel, tagging the
// assignee, with what needs changing.
export const notifyChangesRequested = async ({ channelId, reviewerName, taskTitle, assigneeSlackId, note }) => {
  const who = assigneeSlackId ? ` ${`<@${assigneeSlackId}>`}` : "";
  let text = `:arrows_counterclockwise: *Changes requested* on *${taskTitle}* by *${reviewerName}* at *${nowIST()}*${who}`;
  if (note) text += `\n>${note.replace(/\n/g, "\n>")}`;
  await postToChannel(text, channelId);
};

// A task was submitted for review — posted to the project's channel, tagging
// HR + Admin + project managers (+ any extra reviewers), with the submission
// (notes, links, files) the employee filled in.
export const notifyReviewToProject = async ({ channelId, taskTitle, submitterName, tagIds = [], submission }) => {
  const tags = [...new Set(tagIds.filter(Boolean))].map((id) => `<@${id}>`).join(" ");
  const files = submission?.files || [];
  const images = files.filter((f) => f.kind === "image" && /^https?:\/\//.test(f.url || ""));
  const others = files.filter((f) => !images.includes(f));

  let text = `:mag: *Review requested* — *${taskTitle}* submitted by *${submitterName}* at *${nowIST()}*`;
  if (tags) text += `\n${tags}`;
  if (submission?.note) text += `\n>${submission.note.replace(/\n/g, "\n>")}`;
  if (submission?.links?.length) text += `\n*Links:*\n` + submission.links.map((l) => `• ${l}`).join("\n");
  if (others.length) text += `\n*Files:*\n` + others.map((f) => `• ${f.name || f.kind || "file"}: ${f.url}`).join("\n");

  // Render submitted images inline as Slack image blocks (public https only).
  const blocks = [{ type: "section", text: { type: "mrkdwn", text } }];
  for (const img of images.slice(0, 8)) {
    blocks.push({ type: "image", image_url: img.url, alt_text: img.name || "attachment" });
  }
  await postToChannelBlocks(text, blocks, channelId);
};

// Announce that a task was submitted for review. Mentions the extra reviewers the
// assignee named; HR/Admin/PM watch the channel anyway. Fire-and-forget.
export const notifyReviewRequest = async ({ taskTitle, submitterName, reviewers = [] }) => {
  const mentions = reviewers
    .map((r) => (r?.slackUserId ? `<@${r.slackUserId}>` : `*${r?.name || "Reviewer"}*`))
    .join(" ");
  let text = `:mag: *Review requested* — *${taskTitle}* submitted by ${submitterName || "someone"}`;
  if (mentions) text += `\nReviewers: ${mentions}`;
  text += `\n_HR · Admin · Project Managers can review._`;
  await postToChannel(text, taskChannel());
};

// Post a message with Slack blocks (used to render submitted images inline).
export const postToChannelBlocks = async (text, blocks, channelId) => {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = channelId || process.env.SLACK_CHANNEL_ID;
  if (!token || !channel) return console.warn("[slack] not configured — skipping:", text);
  try {
    const r = await fetch(`${SLACK_API}/chat.postMessage`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel, text, blocks }),
    });
    const data = await r.json();
    if (!data.ok) console.error("[slack] postMessage(blocks) failed:", data.error);
  } catch (e) {
    console.error("[slack] postMessage(blocks) error:", e.message);
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

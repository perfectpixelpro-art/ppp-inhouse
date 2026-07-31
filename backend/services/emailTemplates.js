import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMAIL_DIR = path.join(__dirname, "..", "emails");

// Read + cache a template file.
const cache = {};
const load = (file) => (cache[file] ||= fs.readFileSync(path.join(EMAIL_DIR, file), "utf8"));

// Portal base URL for links (strip trailing slash).
const base = () => (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");

// Public logo URL for the email header (overridable via env). Emails need an
// absolute https image; this Cloudinary copy works in every client.
const LOGO_URL = () =>
  process.env.EMAIL_LOGO_URL ||
  "https://res.cloudinary.com/ugbqiche/image/upload/v1785494574/ppp-brand/rxzdteu79bvkbj4shf6d.png";
const brandHeader = () =>
  `<img src="${LOGO_URL()}" alt="PPP HR" height="34" style="display:block; height:34px; width:auto; border:0; outline:none; text-decoration:none;">`;

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Replace {{key}} and {key} placeholders. Values are HTML-escaped unless the key
// ends with "_link" or "_rows" (URLs / pre-built HTML).
const fill = (html, vars) => {
  let out = html;
  for (const [k, v] of Object.entries(vars)) {
    const val = k.endsWith("_link") || k.endsWith("_rows") || k === "reset_link" ? String(v ?? "") : esc(v);
    out = out.split(`{{${k}}}`).join(val).split(`{${k}}`).join(val);
  }
  // Swap the "PPP HR" text logo for the brand image.
  out = out.split('<span style="color:#ec3013;">PPP</span>&nbsp;HR').join(brandHeader());
  // any leftover placeholders → blank
  return out.replace(/\{\{[a-z_0-9]+\}\}/g, "").replace(/\{[a-z_0-9]+\}/g, (m) => (m === "{name}" ? "" : m));
};

const dmy = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—");

// ---- individual emails ----

export const passwordResetEmail = ({ name, resetLink }) =>
  fill(load("1-password-reset.html"), { name: name || "there", reset_link: resetLink, unsubscribe_link: base() });

export const newLeaveRequestEmail = ({ name, leaveType, startDate, endDate, numDays, reason }) =>
  fill(load("2-new-leave-request.html"), {
    name: name || "Team", leave_type: leaveType, start_date: dmy(startDate), end_date: dmy(endDate),
    num_days: numDays, reason: reason || "—",
    approve_link: `${base()}/`, reject_link: `${base()}/`, review_link: `${base()}/`, unsubscribe_link: base(),
  });

export const documentsSubmittedEmail = ({ name, leaveType, fileCount }) =>
  fill(load("3-documents-submitted.html"), {
    name: name || "Team", leave_type: leaveType, file_count: fileCount ?? 1,
    documents_link: `${base()}/`, unsubscribe_link: base(),
  });

export const leaveDecisionEmail = ({ name, status, startDate, endDate, numDays, hrNote }) => {
  const s = (status || "updated").toLowerCase();
  const color = s === "approved" ? "#16a34a" : s === "rejected" ? "#dc2626" : "#5c5957";
  return fill(load("4-leave-decision.html"), {
    name: name || "there", status: s.toUpperCase(), status_color: color,
    start_date: dmy(startDate), end_date: dmy(endDate), num_days: numDays, hr_note: hrNote || "—",
    portal_link: `${base()}/`, unsubscribe_link: base(),
  });
};

export const rainDayEmail = ({ name, rainDate }) =>
  fill(load("5-rain-day-marked.html"), {
    name: name || "Team", rain_day_date: rainDate, review_link: `${base()}/`, unsubscribe_link: base(),
  });

export const celebrationEmail = ({ name, label, headline, message, detail }) =>
  fill(load("6-birthdays-anniversaries.html"), {
    name: name || "there", occasion_label: label, celebration_headline: headline,
    celebration_message: message, occasion_detail: detail,
    profile_link: `${base()}/`, unsubscribe_link: base(),
  });

// Task summary — rows: [{ status, statusLabel, project, due, timeTaken, reviewTime, feedback }]
const STATUS_COLOR = { todo: "#5c5957", in_progress: "#b45309", in_review: "#ec3013", approved: "#16a34a", done: "#201e1d" };
const taskRowHtml = (r) => `<tr>
  <td style="padding:12px 12px; border-bottom:1px solid #eceae9; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#ffffff;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${STATUS_COLOR[r.status] || "#5c5957"}" style="padding:4px 10px; font-size:11px; font-weight:bold; text-transform:uppercase; letter-spacing:0.3px; color:#ffffff;">${esc(r.statusLabel)}</td></tr></table>
  </td>
  <td style="padding:12px 12px; border-bottom:1px solid #eceae9; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#201e1d;">${esc(r.project)}</td>
  <td style="padding:12px 12px; border-bottom:1px solid #eceae9; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#201e1d;">${esc(r.due)}</td>
  <td style="padding:12px 12px; border-bottom:1px solid #eceae9; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#201e1d;">${esc(r.timeTaken)}</td>
  <td style="padding:12px 12px; border-bottom:1px solid #eceae9; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#201e1d;">${esc(r.reviewTime)}</td>
  <td style="padding:12px 12px; border-bottom:1px solid #eceae9; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#5c5957;">${esc(r.feedback)}</td>
</tr>`;

export const taskSummaryEmail = ({ name, summaryDate, rows }) =>
  fill(load("7-daily-task-summary.html"), {
    name: name || "there", summary_date: summaryDate,
    task_rows: (rows || []).map(taskRowHtml).join(""),
    summary_link: `${base()}/`, unsubscribe_link: base(),
  });

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, "..", ".env");

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/calendar.events",
];

const redirectUri = () =>
  `http://localhost:${process.env.PORT || 5001}/api/google/oauth2callback`;

const oauthClient = () =>
  new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri()
  );

export const isConfigured = () =>
  !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);

export const isAuthorized = () => !!process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

export const getAuthUrl = () =>
  oauthClient().generateAuthUrl({ access_type: "offline", prompt: "consent", scope: SCOPES });

const upsertEnv = (key, value) => {
  let text = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  text = re.test(text) ? text.replace(re, line) : text + (text.endsWith("\n") || !text ? "" : "\n") + line + "\n";
  fs.writeFileSync(ENV_PATH, text);
};

export const exchangeCode = async (code) => {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (tokens.refresh_token) {
    upsertEnv("GOOGLE_OAUTH_REFRESH_TOKEN", tokens.refresh_token);
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN = tokens.refresh_token; // usable immediately
  }
  return tokens;
};

const authedClient = () => {
  const client = oauthClient();
  client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  return client;
};

// Sync a single persistent spreadsheet (create once, then overwrite in place).
// The id is stored in .env as GOOGLE_SHEET_ID so the same sheet is reused.
// `shareWith` = emails granted read/write access (e.g. admin + HR).
export const syncSheet = async ({ title, header, rows, shareWith = [] }) => {
  const auth = authedClient();
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  let id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    const created = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [{ properties: { title: "Attendance", gridProperties: { frozenRowCount: 1 } } }],
      },
    });
    id = created.data.spreadsheetId;
    upsertEnv("GOOGLE_SHEET_ID", id);
    process.env.GOOGLE_SHEET_ID = id;
  }

  const values = [header, ...rows];
  await sheets.spreadsheets.values.clear({ spreadsheetId: id, range: "Attendance" });
  await sheets.spreadsheets.values.update({
    spreadsheetId: id,
    range: "Attendance!A1",
    valueInputOption: "RAW",
    requestBody: { values },
  });

  // Style the header + auto-size columns
  const meta = await sheets.spreadsheets.get({ spreadsheetId: id, fields: "sheets.properties" });
  const sheetId = meta.data.sheets?.[0]?.properties?.sheetId ?? 0;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: id,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                backgroundColor: { red: 0.05, green: 0.05, blue: 0.05 },
              },
            },
            fields: "userEnteredFormat(textFormat,backgroundColor)",
          },
        },
        { autoResizeDimensions: { dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: header.length } } },
      ],
    },
  });

  // Grant access to the given emails (idempotent — Drive dedupes by user)
  for (const email of shareWith) {
    if (!email) continue;
    try {
      await drive.permissions.create({
        fileId: id,
        sendNotificationEmail: false,
        requestBody: { type: "user", role: "writer", emailAddress: email },
      });
    } catch {
      /* already shared / non-account email — ignore */
    }
  }

  return { id, url: `https://docs.google.com/spreadsheets/d/${id}/edit` };
};

// Upsert national holidays as all-day events on the user's primary calendar.
// Deterministic event id per holiday → re-syncing updates instead of duplicating.
export const syncHolidaysToCalendar = async (holidays) => {
  const cal = google.calendar({ version: "v3", auth: authedClient() });
  let n = 0;
  for (const h of holidays) {
    const start = new Date(h.date).toISOString().slice(0, 10);
    const end = new Date(new Date(h.date).getTime() + 86400000).toISOString().slice(0, 10);
    const id = ("ppp" + h.name + start).toLowerCase().replace(/[^a-v0-9]/g, "");
    const body = { id, summary: h.name, start: { date: start }, end: { date: end }, transparency: "transparent" };
    try {
      await cal.events.insert({ calendarId: "primary", requestBody: body });
    } catch (e) {
      if (e.code === 409) await cal.events.update({ calendarId: "primary", eventId: id, requestBody: body });
      else throw e;
    }
    n++;
  }
  return n;
};

// Google's official public holiday calendar for India — festival dates (Holi,
// Diwali, etc.) shift each year and are maintained here, so we read from it.
const HOLIDAY_CAL_ID = "en.indian#holiday@group.v.calendar.google.com";

// Pull national holidays from the public India calendar between two ISO instants.
// Returns [{ name, date: "YYYY-MM-DD" }].
export const fetchHolidaysFromCalendar = async ({ timeMin, timeMax }) => {
  const cal = google.calendar({ version: "v3", auth: authedClient() });
  const out = [];
  let pageToken;
  do {
    const { data } = await cal.events.list({
      calendarId: HOLIDAY_CAL_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 2500,
      pageToken,
    });
    for (const e of data.items || []) {
      const date = e.start?.date || e.start?.dateTime?.slice(0, 10);
      if (date && e.summary) out.push({ name: e.summary, date });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return out;
};

// Build a live Google Sheet from header + rows, optionally share with an email.
export const createSheet = async ({ title, header, rows, shareWith }) => {
  const auth = authedClient();
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  const toCell = (c) =>
    typeof c === "number"
      ? { userEnteredValue: { numberValue: c } }
      : { userEnteredValue: { stringValue: String(c ?? "") } };

  const rowData = [header, ...rows].map((r) => ({ values: r.map(toCell) }));

  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: [
        {
          properties: { title: "Attendance", gridProperties: { frozenRowCount: 1 } },
          data: [{ startRow: 0, startColumn: 0, rowData }],
        },
      ],
    },
  });

  const spreadsheetId = created.data.spreadsheetId;
  const sheetId = created.data.sheets?.[0]?.properties?.sheetId ?? 0;

  // Bold + shade the header row
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                backgroundColor: { red: 0.05, green: 0.05, blue: 0.05 },
              },
            },
            fields: "userEnteredFormat(textFormat,backgroundColor)",
          },
        },
        { autoResizeDimensions: { dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: header.length } } },
      ],
    },
  });

  if (shareWith) {
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        sendNotificationEmail: false,
        requestBody: { type: "user", role: "writer", emailAddress: shareWith },
      });
    } catch {
      /* sharing best-effort */
    }
  }

  return { id: spreadsheetId, url: created.data.spreadsheetUrl };
};

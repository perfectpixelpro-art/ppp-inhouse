// Small formatting helpers shared across screens (mirrors web utils).

const HOUR = 3600000;

export const targetMs = (rec) => (rec?.dayType === "half" ? 4 : 8) * HOUR;

// Live worked ms for today's record (adds the running segment while working).
export const workedNow = (rec, now = Date.now()) => {
  if (!rec) return 0;
  let ms = rec.workedMs || 0;
  if (rec.state === "working" && rec.currentStart) {
    ms += now - new Date(rec.currentStart).getTime();
  }
  return ms;
};

// HH:MM:SS clock.
export const fmtClock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
};

// "2h 30m" style.
export const fmtHm = (ms) => {
  const mins = Math.round(Math.abs(ms) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

export const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";

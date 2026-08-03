// PPP brand tokens — mirrors the web app's palette (frontend/src/index.css).
export const colors = {
  red: "#e11d2a",
  redDark: "#b3141f",
  accent: "#ec3013",
  black: "#0d0d0d",
  white: "#ffffff",
  gray50: "#f6f6f7",
  gray200: "#e4e4e7",
  gray400: "#a1a1aa",
  gray600: "#52525b",
  green: "#16a34a",
  amber: "#b45309",
  amberBg: "#fef3c7",
};

// Task status → label + color (mirrors pmUtils on the web).
export const STATUS = {
  todo: { label: "To-do", color: "#6b7280" },
  in_progress: { label: "In Progress", color: "#b45309" },
  in_review: { label: "In Review", color: "#2563eb" },
  approved: { label: "Approved", color: "#0d9488" },
  done: { label: "Done", color: "#16a34a" },
};

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
export const spacing = (n) => n * 4;

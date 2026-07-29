// Shared role helpers.

// Roles that see EVERY employee's tasks / projects / portfolio in the PM module.
export const PM_VIEWERS = ["admin", "hr", "project_manager"];
export const canSeeAllPM = (role) => PM_VIEWERS.includes(role);

// Which portal a role lands in. Project managers use the employee portal but get
// org-wide visibility inside Project Management.
export const portalPath = (role) =>
  role === "admin" ? "/admin" : role === "hr" ? "/hr" : "/employee";

export const ROLE_LABEL = {
  admin: "Admin",
  hr: "HR",
  employee: "Employee",
  project_manager: "Project Manager",
};

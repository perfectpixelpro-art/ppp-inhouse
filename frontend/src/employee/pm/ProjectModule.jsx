import { Outlet } from "react-router-dom";
import "./pm.css";

// Project Management shell. The section's navigation (Home / My Tasks / Projects /
// Portfolio) lives in the main portal sidebar and is shown there only while the
// user is inside this section (see EmployeeLayout). This wrapper just hosts the
// active sub-page.
export default function ProjectModule() {
  return (
    <div className="pm-body">
      <Outlet />
    </div>
  );
}

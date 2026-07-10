import EmployeesPage from "./tabs/EmployeesPage";
import SalaryPage from "./tabs/SalaryPage";
import LeavesPage from "./tabs/LeavesPage";
import LeavesRemainingPage from "./tabs/LeavesRemainingPage";
import NationalHolidaysPage from "../employee/tabs/EmpUpcomingHolidaysPage";
import SpecialDaysPage from "./tabs/SpecialDaysPage";
import ExpensesPage from "./tabs/ExpensesPage";
import LeaveApplicationsPage from "./tabs/LeaveApplicationsPage";
import AttendancePage from "./tabs/AttendancePage";
import DocumentsPage from "./tabs/DocumentsPage";
import BirthdaysPage from "./tabs/BirthdaysPage";
import PolicyEditPage from "./tabs/PolicyEditPage";
import GalleryManagePage from "./tabs/GalleryManagePage";
import NoticesPage from "./tabs/NoticesPage";

// Single source of truth for both the sidebar nav and the router.
// `roles` controls which panels a tab appears in. Financial tabs
// (Salary, Expenses) are Admin-only; everything else is shared with HR.
export const TABS = [
  { to: "employees", label: "Employees", icon: "👥", roles: ["admin", "hr"], element: <EmployeesPage /> },
  { to: "salary", label: "Salary", icon: "💰", roles: ["admin", "hr"], element: <SalaryPage /> },
  { to: "leaves", label: "Leaves", icon: "🌴", roles: ["admin", "hr"], element: <LeavesPage /> },
  { to: "leaves-remaining", label: "Leaves Remaining", icon: "📊", roles: ["admin", "hr"], element: <LeavesRemainingPage /> },
  { to: "upcoming-holidays", label: "National Holidays", icon: "📅", roles: ["admin", "hr"], element: <NationalHolidaysPage /> },
  { to: "special-days", label: "Special Days", icon: "🎉", roles: ["admin", "hr"], element: <SpecialDaysPage /> },
  { to: "expenses", label: "Expenses", icon: "🧾", roles: ["admin", "hr"], element: <ExpensesPage /> },
  { to: "leave-applications", label: "Leave Applications", icon: "📝", roles: ["admin", "hr"], element: <LeaveApplicationsPage /> },
  { to: "attendance", label: "In / Out", icon: "⏰", roles: ["admin", "hr"], element: <AttendancePage /> },
  { to: "documents", label: "Documents", icon: "📁", roles: ["admin", "hr"], element: <DocumentsPage /> },
  { to: "policy", label: "Policy", icon: "📜", roles: ["admin", "hr"], element: <PolicyEditPage /> },
  { to: "gallery", label: "Gallery", icon: "🖼️", roles: ["admin", "hr"], element: <GalleryManagePage /> },
  { to: "notices", label: "Notices", icon: "📢", roles: ["admin", "hr"], element: <NoticesPage /> },
  { to: "birthdays", label: "Birthdays", icon: "🎂", roles: ["admin", "hr"], element: <BirthdaysPage /> },
];

export const tabsForRole = (role) => TABS.filter((t) => t.roles.includes(role));

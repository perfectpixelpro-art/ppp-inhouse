import client from "./client";

// Image upload — returns { url }
export const uploadFile = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return client.post("/uploads", fd).then((r) => r.data);
};

// Employees
export const fetchEmployees = (params) => client.get("/employees", { params }).then((r) => r.data);
export const createEmployee = (data) => client.post("/employees", data).then((r) => r.data);
export const updateEmployee = (id, data) => client.put(`/employees/${id}`, data).then((r) => r.data);
export const deleteEmployee = (id) => client.delete(`/employees/${id}`).then((r) => r.data);

// Leaves
export const fetchLeaves = (params) => client.get("/leaves", { params }).then((r) => r.data);
export const fetchLeaveBalance = () => client.get("/leaves/balance").then((r) => r.data);
export const createLeave = (data) => client.post("/leaves", data).then((r) => r.data);
export const setLeaveStatus = (id, status, note) => client.patch(`/leaves/${id}/status`, { status, note }).then((r) => r.data);

// Expenses
export const fetchExpenses = (params) => client.get("/expenses", { params }).then((r) => r.data);
export const createExpense = (data) => client.post("/expenses", data).then((r) => r.data);
export const deleteExpense = (id) => client.delete(`/expenses/${id}`).then((r) => r.data);

// Attendance
export const fetchAttendance = (params) => client.get("/attendance", { params }).then((r) => r.data);

// Google Sheets sync (admin/hr)
export const googleStatus = () => client.get("/google/status").then((r) => r.data);
export const syncAttendanceSheet = (month) => client.post("/google/sync/attendance", null, { params: { month } }).then((r) => r.data);
export const syncHolidaysCalendar = () => client.post("/google/sync/holidays").then((r) => r.data);
export const importHolidaysCalendar = () => client.post("/google/import/holidays").then((r) => r.data);

// Documents
export const fetchDocuments = (params) => client.get("/documents", { params }).then((r) => r.data);
export const createDocument = (data) => client.post("/documents", data).then((r) => r.data);
export const deleteDocument = (id) => client.delete(`/documents/${id}`).then((r) => r.data);

// Holidays
export const fetchHolidays = (params) => client.get("/holidays", { params }).then((r) => r.data);
export const createHoliday = (data) => client.post("/holidays", data).then((r) => r.data);
export const deleteHoliday = (id) => client.delete(`/holidays/${id}`).then((r) => r.data);

// Policy
export const fetchPolicy = () => client.get("/policy").then((r) => r.data);
export const savePolicy = (content) => client.put("/policy", { content }).then((r) => r.data);

// Gallery
export const fetchGallery = () => client.get("/gallery").then((r) => r.data);
export const createGallery = (data) => client.post("/gallery", data).then((r) => r.data);
export const deleteGallery = (id) => client.delete(`/gallery/${id}`).then((r) => r.data);

import client from "./client";

// Attendance
export const myAttendance = () => client.get("/me/attendance").then((r) => r.data);
export const myToday = () => client.get("/me/attendance/today").then((r) => r.data);
export const checkIn = (dayType) =>
  client.post("/me/attendance/checkin", dayType ? { dayType } : {}).then((r) => r.data);
export const checkOut = (mode) => client.post("/me/attendance/checkout", { mode }).then((r) => r.data);
export const saveDsr = (dsr) => client.post("/me/attendance/dsr", { dsr }).then((r) => r.data);
export const markRain = (rain) => client.post("/me/attendance/rain", { rain }).then((r) => r.data);
export const fetchHolidays = (params) => client.get("/holidays", { params }).then((r) => r.data);

// Leaves
export const myLeaves = () => client.get("/me/leaves").then((r) => r.data);
export const applyLeave = (data) => client.post("/me/leaves", data).then((r) => r.data);

// Tasks (Project Management)
export const myTasks = () => client.get("/tasks/mine").then((r) => r.data);
export const fetchTask = (id) => client.get(`/tasks/${id}`).then((r) => r.data);
export const setTaskStatus = (id, status) =>
  client.patch(`/tasks/${id}/status`, { status }).then((r) => r.data);
export const fetchProjects = () => client.get("/projects").then((r) => r.data);
export const fetchPortfolio = () => client.get("/tasks/portfolio").then((r) => r.data);

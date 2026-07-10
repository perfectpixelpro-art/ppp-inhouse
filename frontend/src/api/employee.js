import client from "./client";
import { isTouchDevice, deviceKind, getLocation } from "./device";

// Attendance (self)
export const myAttendance = () => client.get("/me/attendance").then((r) => r.data);
export const myToday = () => client.get("/me/attendance/today").then((r) => r.data);
// Touch devices (phone/tablet in desktop mode) must attach a location; Macs don't.
export const checkIn = async (dayType) => {
  const body = dayType ? { dayType } : {};
  if (isTouchDevice()) {
    Object.assign(body, await getLocation(), { touch: true, deviceKind: deviceKind() });
  }
  return client.post("/me/attendance/checkin", body).then((r) => r.data);
};
export const checkOut = (mode) => client.post("/me/attendance/checkout", { mode }).then((r) => r.data);
export const saveDsr = (dsr) => client.post("/me/attendance/dsr", { dsr }).then((r) => r.data);
export const markRain = (rain) => client.post("/me/attendance/rain", { rain }).then((r) => r.data);
export const attachLeaveDoc = (id, attachment) => client.post(`/me/leaves/${id}/attachment`, { attachment }).then((r) => r.data);
export const updateMyProfile = (data) => client.patch("/me/profile", data).then((r) => r.data);

// Leaves (self)
export const myLeaves = () => client.get("/me/leaves").then((r) => r.data);
export const applyLeave = (data) => client.post("/me/leaves", data).then((r) => r.data);

// Gallery
export const fetchGallery = () => client.get("/gallery").then((r) => r.data);

// Holidays / special days (read-only for employees)
export const fetchHolidays = (params) => client.get("/holidays", { params }).then((r) => r.data);

// Company policy (read-only)
export const fetchPolicy = () => client.get("/policy").then((r) => r.data);

// Notices for me + acknowledge
export const fetchMyNotices = () => client.get("/notices/mine").then((r) => r.data);
export const ackNotice = (id, note) => client.post(`/notices/${id}/ack`, { note }).then((r) => r.data);

// Image upload — returns { url }
export const uploadFile = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return client.post("/uploads", fd).then((r) => r.data);
};

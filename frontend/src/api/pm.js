import client from "./client";

// --- Projects ---
export const fetchProjects = () => client.get("/projects").then((r) => r.data);
export const fetchProject = (id) => client.get(`/projects/${id}`).then((r) => r.data);
export const fetchProjectStats = (id) => client.get(`/projects/${id}/stats`).then((r) => r.data);
export const fetchProjectAssets = (id) => client.get(`/projects/${id}/assets`).then((r) => r.data);
export const fetchProjectResources = (id) => client.get(`/projects/${id}/resources`).then((r) => r.data);
export const addProjectResource = (id, data) => client.post(`/projects/${id}/resources`, data).then((r) => r.data);
export const removeProjectResource = (id, resId) => client.delete(`/projects/${id}/resources/${resId}`).then((r) => r.data);
export const createProject = (data) => client.post("/projects", data).then((r) => r.data);
export const updateProject = (id, data) => client.put(`/projects/${id}`, data).then((r) => r.data);
export const deleteProject = (id) => client.delete(`/projects/${id}`).then((r) => r.data);

// --- Tasks ---
export const fetchMyTasks = () => client.get("/tasks/mine").then((r) => r.data);
export const fetchAllTasks = () => client.get("/tasks/all").then((r) => r.data); // admin/HR only
export const fetchTask = (id) => client.get(`/tasks/${id}`).then((r) => r.data); // full detail
export const addTaskComment = (id, text) => client.post(`/tasks/${id}/comments`, { text }).then((r) => r.data);
export const submitReview = (id, data) => client.post(`/tasks/${id}/submit-review`, data).then((r) => r.data);
export const requestChanges = (id, note) => client.post(`/tasks/${id}/request-changes`, { note }).then((r) => r.data);
// Upload any file (image/video/doc) → { url, name, kind }
const MAX_ATTACHMENT_MB = 500;
export const uploadAttachment = (file) => {
  if (file && file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
    return Promise.reject(new Error(`This file is ${(file.size / 1048576).toFixed(0)} MB. The limit is ${MAX_ATTACHMENT_MB} MB — please compress or trim it.`));
  }
  const fd = new FormData();
  fd.append("file", file);
  return client.post("/uploads/file", fd).then((r) => r.data).catch((e) => {
    if (e.response?.status === 413) throw new Error(`File too large — the limit is ${MAX_ATTACHMENT_MB} MB.`);
    throw new Error(e.response?.data?.message || "Upload failed. Please try again.");
  });
};
export const addDependency = (id, data) => client.post(`/tasks/${id}/dependencies`, data).then((r) => r.data);
export const removeDependency = (id, depId) => client.delete(`/tasks/${id}/dependencies/${depId}`).then((r) => r.data);
export const fetchProjectTasks = (projectId) => client.get("/tasks", { params: { project: projectId } }).then((r) => r.data);
export const fetchPortfolio = (params) => client.get("/tasks/portfolio", { params }).then((r) => r.data);
export const fetchAssignableUsers = () => client.get("/tasks/assignable").then((r) => r.data);
export const createTask = (data) => client.post("/tasks", data).then((r) => r.data);
export const createTasksBulk = (tasks) => client.post("/tasks/bulk", { tasks }).then((r) => r.data);
export const updateTask = (id, data) => client.patch(`/tasks/${id}`, data).then((r) => r.data);
export const deleteTask = (id) => client.delete(`/tasks/${id}`).then((r) => r.data);

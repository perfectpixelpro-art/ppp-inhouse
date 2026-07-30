import client from "./client";

// --- Projects ---
export const fetchProjects = () => client.get("/projects").then((r) => r.data);
export const fetchProject = (id) => client.get(`/projects/${id}`).then((r) => r.data);
export const fetchProjectStats = (id) => client.get(`/projects/${id}/stats`).then((r) => r.data);
export const fetchProjectAssets = (id) => client.get(`/projects/${id}/assets`).then((r) => r.data);
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
export const uploadAttachment = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return client.post("/uploads/file", fd).then((r) => r.data);
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

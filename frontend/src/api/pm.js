import client from "./client";

// --- Projects ---
export const fetchProjects = () => client.get("/projects").then((r) => r.data);
export const fetchProject = (id) => client.get(`/projects/${id}`).then((r) => r.data);
export const fetchProjectStats = (id) => client.get(`/projects/${id}/stats`).then((r) => r.data);
export const createProject = (data) => client.post("/projects", data).then((r) => r.data);
export const updateProject = (id, data) => client.put(`/projects/${id}`, data).then((r) => r.data);
export const deleteProject = (id) => client.delete(`/projects/${id}`).then((r) => r.data);

// --- Tasks ---
export const fetchMyTasks = () => client.get("/tasks/mine").then((r) => r.data);
export const fetchAllTasks = () => client.get("/tasks/all").then((r) => r.data); // admin/HR only
export const fetchProjectTasks = (projectId) => client.get("/tasks", { params: { project: projectId } }).then((r) => r.data);
export const fetchPortfolio = (params) => client.get("/tasks/portfolio", { params }).then((r) => r.data);
export const fetchAssignableUsers = () => client.get("/tasks/assignable").then((r) => r.data);
export const createTask = (data) => client.post("/tasks", data).then((r) => r.data);
export const updateTask = (id, data) => client.patch(`/tasks/${id}`, data).then((r) => r.data);
export const deleteTask = (id) => client.delete(`/tasks/${id}`).then((r) => r.data);

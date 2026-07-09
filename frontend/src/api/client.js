import axios from "axios";

// Requests hit /api and are proxied to the backend by Vite (see vite.config.js)
const client = axios.create({ baseURL: "/api" });

// Attach the JWT to every request if present
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("ppp_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear the session so the app falls back to the login screen
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("ppp_token");
    }
    return Promise.reject(err);
  }
);

export default client;

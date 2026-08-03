import axios from "axios";
import * as SecureStore from "expo-secure-store";

// The live backend. On a phone we can't use localhost — point at the public API.
// Override with EXPO_PUBLIC_API_URL in an .env for local testing against a LAN IP.
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "https://hr.perfectpixelpro.app/api";

const TOKEN_KEY = "ppp_token";

export const saveToken = (t) => SecureStore.setItemAsync(TOKEN_KEY, t);
export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const clearToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);

const client = axios.create({ baseURL: API_BASE });

// Attach the JWT to every request (SecureStore replaces the web's localStorage).
client.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, drop the session so the app returns to Login.
client.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) await clearToken();
    return Promise.reject(err);
  }
);

export default client;

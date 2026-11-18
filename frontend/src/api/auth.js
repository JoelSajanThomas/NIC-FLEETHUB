import { api } from "./client.js";

export const authApi = {
  login: (username, password) => api.post("/api/login", { username, password }),
  logout: () => api.post("/api/logout"),
  getMe: () => api.get("/api/me"),
  setLanguage: (lang) => api.post("/api/user/lang", { lang })
};

export default authApi;

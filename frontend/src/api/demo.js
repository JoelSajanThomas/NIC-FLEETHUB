import { api } from "./client.js";

export const demoApi = {
  getStatus: () => api.get("/api/admin/demo/status"),
  getPreview: () => api.get("/api/admin/demo/preview"),
  loadDemoData: () => api.post("/api/admin/demo/load"),
  clearDemoData: () => api.post("/api/admin/demo/clear")
};

export default demoApi;

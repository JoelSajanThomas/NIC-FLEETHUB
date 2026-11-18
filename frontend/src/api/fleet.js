import { api } from "./client.js";

export const fleetApi = {
  getAssets: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/assets${qs ? "?" + qs : ""}`);
  },
  getMyAssets: () => api.get("/api/my-assets"),
  getAsset: (id) => api.get(`/api/assets/${id}/history`),
  createAsset: (data) => api.post("/api/assets", data),
  updateAsset: (id, data) => api.put(`/api/assets/${id}`, data),
  relocateAsset: (id, data) => api.post(`/api/assets/${id}/transfer`, data),
  archiveAsset: (id) => api.post(`/api/assets/${id}/archive`),
  search: (query) => api.get(`/api/search?q=${encodeURIComponent(query)}`),
  getWorksites: () => api.get("/api/worksites"),
  createWorksite: (data) => api.post("/api/worksites", data),
  updateWorksite: (id, data) => api.put(`/api/worksites/${id}`, data)
};

export default fleetApi;

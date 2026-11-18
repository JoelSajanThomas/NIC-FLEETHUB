import { api } from "./client.js";

export const inventoryApi = {
  getParts: (query = "") => api.get(`/api/parts${query ? "?q=" + encodeURIComponent(query) : ""}`),
  createPart: (data) => api.post("/api/parts", data),
  stockMovement: (pid, data) => api.post(`/api/parts/${pid}/stock`, data),
  issuePart: (pid, data) => api.post(`/api/parts/${pid}/issue`, data),
  returnPart: (pid, data) => api.post(`/api/parts/${pid}/return`, data),
  getPartHistory: (pid) => api.get(`/api/parts/${pid}/history`),
  getSuppliers: () => api.get("/api/suppliers"),
  createSupplier: (data) => api.post("/api/suppliers", data),
  updateSupplier: (id, data) => api.put(`/api/suppliers/${id}`, data),
  toggleSupplier: (id) => api.post(`/api/suppliers/${id}/toggle`)
};

export default inventoryApi;

import { api } from "./client.js";

export const operationsApi = {
  getComplaints: () => api.get("/api/complaints"),
  createComplaint: (formData) => api.upload("/api/complaints", formData),
  decideComplaint: (id, decision, note, priority) => api.post(`/api/complaints/${id}/decide`, { decision, note, priority }),
  getWorkOrders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/work-orders${qs ? "?" + qs : ""}`);
  },
  createWorkOrder: (data) => api.post("/api/work-orders", data),
  updateWorkOrderStatus: (id, data) => api.post(`/api/work-orders/${id}/status`, data),
  uploadWorkOrderDoc: (id, formData) => api.upload(`/api/work-orders/${id}/documents`, formData)
};

export default operationsApi;

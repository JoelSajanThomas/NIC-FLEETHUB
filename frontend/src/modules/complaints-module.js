/**
 * Complaints & Driver Defect Reports Module
 */
import { operationsApi } from "../api/operations.js";

export const complaintsModule = {
  loadComplaints: async () => {
    return await operationsApi.getComplaints();
  },
  submitComplaint: async (formData) => {
    return await operationsApi.createComplaint(formData);
  },
  decideComplaint: async (id, decision, note, priority) => {
    return await operationsApi.decideComplaint(id, decision, note, priority);
  }
};

export default complaintsModule;

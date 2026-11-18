/**
 * Historical Maintenance Records Digitization Module
 */
import { api } from "../api/client.js";

export const historicalModule = {
  loadHistoricalRecords: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return await api.get(`/api/historical${qs ? "?" + qs : ""}`);
  },
  createHistoricalRecord: async (formData) => {
    return await api.upload("/api/historical", formData);
  }
};

export default historicalModule;

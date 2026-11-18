/**
 * Demo Data Management & Cleanup Module
 */
import { demoApi } from "../api/demo.js";

export const demoModule = {
  getDemoStatus: async () => {
    return await demoApi.getStatus();
  },
  getDemoPreview: async () => {
    return await demoApi.getPreview();
  },
  loadDemoData: async () => {
    return await demoApi.loadDemoData();
  },
  clearAllDemoData: async () => {
    return await demoApi.clearDemoData();
  }
};

export default demoModule;

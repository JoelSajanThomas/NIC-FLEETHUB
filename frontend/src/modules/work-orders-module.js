/**
 * Work Orders & Workshop Repair Lifecycle Module
 */
import { operationsApi } from "../api/operations.js";

export const workOrdersModule = {
  loadWorkOrders: async (params) => {
    return await operationsApi.getWorkOrders(params);
  },
  createWorkOrder: async (data) => {
    return await operationsApi.createWorkOrder(data);
  },
  updateStatus: async (id, statusData) => {
    return await operationsApi.updateWorkOrderStatus(id, statusData);
  }
};

export default workOrdersModule;

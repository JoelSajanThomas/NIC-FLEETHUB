/**
 * Spare Parts & Warehouse Inventory Module
 */
import { inventoryApi } from "../api/inventory.js";

export const inventoryModule = {
  loadParts: async (query) => {
    return await inventoryApi.getParts(query);
  },
  createPart: async (data) => {
    return await inventoryApi.createPart(data);
  },
  issuePartToWorkOrder: async (pid, data) => {
    return await inventoryApi.issuePart(pid, data);
  },
  receiveStock: async (pid, data) => {
    return await inventoryApi.stockMovement(pid, { ...data, kind: "in" });
  }
};

export default inventoryModule;

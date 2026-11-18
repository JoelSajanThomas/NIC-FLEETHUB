/**
 * External Procurement & Purchases Module
 */
import { financeApi } from "../api/finance.js";

export const purchasesModule = {
  loadPurchases: async () => {
    return await financeApi.getPurchases();
  },
  createPurchaseRequest: async (data) => {
    return await financeApi.createPurchase(data);
  },
  decidePurchase: async (id, decision) => {
    return await financeApi.decidePurchase(id, decision);
  },
  recordPurchaseBill: async (id, formData) => {
    return await financeApi.recordPurchase(id, formData);
  }
};

export default purchasesModule;

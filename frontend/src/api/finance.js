import { api } from "./client.js";

export const financeApi = {
  getExpenses: () => api.get("/api/expenses"),
  createExpense: (formData) => api.upload("/api/expenses", formData),
  getPurchases: () => api.get("/api/purchases"),
  createPurchase: (data) => api.post("/api/purchases", data),
  decidePurchase: (id, decision) => api.post(`/api/purchases/${id}/decide`, { decision }),
  recordPurchase: (id, formData) => api.upload(`/api/purchases/${id}/record`, formData),
  getCurrencyRates: () => api.get("/api/currency/rates"),
  setCurrencyRate: (currency, rate_to_kwd) => api.post("/api/currency/rates", { currency, rate_to_kwd }),
  convertCurrency: (amount, currency, exchange_rate) => api.post("/api/currency/convert", { amount, currency, exchange_rate }),
  syncCurrencyRates: () => api.post("/api/currency/sync")
};

export default financeApi;

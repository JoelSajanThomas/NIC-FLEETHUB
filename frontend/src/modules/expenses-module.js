/**
 * Maintenance Expenses & Financial Ledger Module
 */
import { financeApi } from "../api/finance.js";

export const expensesModule = {
  loadExpenses: async () => {
    return await financeApi.getExpenses();
  },
  recordExpense: async (formData) => {
    return await financeApi.createExpense(formData);
  }
};

export default expensesModule;

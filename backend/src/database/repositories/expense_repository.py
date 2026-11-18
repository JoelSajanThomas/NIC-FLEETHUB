"""Expense repository for maintenance financial transactions in KWD."""
from ..connection import one, rows

class ExpenseRepository:
    @staticmethod
    def list_all():
        sql = """
            SELECT e.*, a.code as asset_code, a.name as asset_name,
                   w.code as wo_code
            FROM expenses e
            JOIN assets a ON e.asset_id = a.id
            LEFT JOIN work_orders w ON e.wo_id = w.id
            ORDER BY e.id DESC
        """
        return rows(sql)

    @staticmethod
    def total_kwd():
        r = one("SELECT COALESCE(SUM(amount), 0) as total FROM expenses")
        return r["total"] if r else 0.0

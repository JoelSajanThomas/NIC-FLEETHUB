"""Purchase repository for procurement orders and invoices."""
from ..connection import get_db, one, rows

class PurchaseRepository:
    @staticmethod
    def list_all():
        sql = """
            SELECT pu.*, a.code as asset_code, a.name as asset_name,
                   w.code as wo_code, s.name as supplier_name_full
            FROM purchases pu
            LEFT JOIN assets a ON pu.asset_id = a.id
            LEFT JOIN work_orders w ON pu.wo_id = w.id
            LEFT JOIN suppliers s ON pu.supplier_id = s.id
            ORDER BY pu.id DESC
        """
        return rows(sql)

    @staticmethod
    def get_by_id(pid):
        sql = """
            SELECT pu.*, a.code as asset_code, a.name as asset_name
            FROM purchases pu
            LEFT JOIN assets a ON pu.asset_id = a.id
            WHERE pu.id = ?
        """
        return one(sql, (pid,))

    @staticmethod
    def next_code():
        cur = get_db().execute("SELECT MAX(id) FROM purchases")
        max_id = (cur.fetchone()[0] or 0) + 1
        return f"PUR-{max_id:05d}"

"""Work order repository for maintenance order data operations."""
from ..connection import get_db, one, rows

class WorkOrderRepository:
    @staticmethod
    def list_all(status=None):
        where = ["1=1"]
        params = []
        if status:
            where.append("w.status = ?")
            params.append(status)
        sql = f"""
            SELECT w.*, a.code as asset_code, a.name as asset_name,
                   c.code as complaint_code
            FROM work_orders w
            JOIN assets a ON w.asset_id = a.id
            LEFT JOIN complaints c ON w.complaint_id = c.id
            WHERE {' AND '.join(where)}
            ORDER BY w.id DESC
        """
        return rows(sql, params)

    @staticmethod
    def get_by_id(wo_id):
        sql = """
            SELECT w.*, a.code as asset_code, a.name as asset_name
            FROM work_orders w
            JOIN assets a ON w.asset_id = a.id
            WHERE w.id = ?
        """
        return one(sql, (wo_id,))

    @staticmethod
    def next_code():
        cur = get_db().execute("SELECT MAX(id) FROM work_orders")
        max_id = (cur.fetchone()[0] or 0) + 1
        return f"WO-{max_id:05d}"

"""Complaint repository for driver defect reports."""
from ..connection import get_db, one, rows

class ComplaintRepository:
    @staticmethod
    def list_all():
        sql = """
            SELECT c.*, a.code as asset_code, a.name as asset_name
            FROM complaints c
            JOIN assets a ON c.asset_id = a.id
            ORDER BY c.id DESC
        """
        return rows(sql)

    @staticmethod
    def get_by_id(cid):
        sql = """
            SELECT c.*, a.code as asset_code, a.name as asset_name
            FROM complaints c
            JOIN assets a ON c.asset_id = a.id
            WHERE c.id = ?
        """
        return one(sql, (cid,))

    @staticmethod
    def next_code():
        cur = get_db().execute("SELECT MAX(id) FROM complaints")
        max_id = (cur.fetchone()[0] or 0) + 1
        return f"CMP-{max_id:05d}"

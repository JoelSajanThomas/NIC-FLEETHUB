"""Spare parts repository for catalog and inventory stock operations."""
from ..connection import get_db, one, rows

class PartRepository:
    @staticmethod
    def list_all():
        sql = """
            SELECT p.*, s.name as supplier_name
            FROM parts p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            ORDER BY p.id DESC
        """
        return rows(sql)

    @staticmethod
    def get_by_id(pid):
        sql = """
            SELECT p.*, s.name as supplier_name
            FROM parts p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = ?
        """
        return one(sql, (pid,))

    @staticmethod
    def next_stock_id():
        cur = get_db().execute("SELECT MAX(id) FROM parts")
        max_id = (cur.fetchone()[0] or 0) + 1
        return f"STK-{max_id:05d}"

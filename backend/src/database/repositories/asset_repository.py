"""Asset repository for vehicle & heavy equipment data operations."""
from ..connection import get_db, tx, one, rows
from ...utils.helpers import now

class AssetRepository:
    @staticmethod
    def list_all(include_archived=False, search=None):
        where = ["archived = 0"] if not include_archived else ["1=1"]
        params = []
        if search:
            where.append("(name LIKE ? OR code LIKE ? OR reg_no LIKE ? OR vin LIKE ? OR model LIKE ?)")
            p = f"%{search}%"
            params.extend([p, p, p, p, p])
        sql = f"""
            SELECT a.*, w.name as worksite_name
            FROM assets a
            LEFT JOIN worksites w ON a.worksite_id = w.id
            WHERE {' AND '.join(where)}
            ORDER BY a.id DESC
        """
        return rows(sql, params)

    @staticmethod
    def get_by_id(asset_id):
        sql = """
            SELECT a.*, w.name as worksite_name
            FROM assets a
            LEFT JOIN worksites w ON a.worksite_id = w.id
            WHERE a.id = ?
        """
        return one(sql, (asset_id,))

    @staticmethod
    def get_by_code(code):
        sql = "SELECT * FROM assets WHERE code = ?"
        return one(sql, (code,))

    @staticmethod
    def next_code():
        cur = get_db().execute("SELECT MAX(id) FROM assets")
        max_id = (cur.fetchone()[0] or 0) + 1
        return f"AST-{max_id:05d}"

"""User repository for administrative account operations."""
from ..connection import one, rows

class UserRepository:
    @staticmethod
    def list_all():
        sql = "SELECT id, username, name, role, active, preferred_lang FROM users ORDER BY id"
        return rows(sql)

    @staticmethod
    def get_by_id(uid):
        sql = "SELECT id, username, name, role, active, preferred_lang FROM users WHERE id = ?"
        return one(sql, (uid,))

    @staticmethod
    def get_by_username(username):
        sql = "SELECT * FROM users WHERE username = ?"
        return one(sql, (username,))

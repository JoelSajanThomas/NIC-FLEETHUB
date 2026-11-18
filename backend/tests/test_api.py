"""Basic API and database unit tests for NIC FleetHub Backend."""
import unittest, json
from src.app import create_app

class FleetHubBackendTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_sync_version(self):
        res = self.client.get("/api/sync/version")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("version", data)

    def test_public_stats(self):
        res = self.client.get("/api/public/stats")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("fleet", data)
        self.assertIn("operations", data)
        self.assertIn("inventory", data)
        self.assertEqual(data["fleet"]["total"], 7)

    def test_auth_login_and_protected_route(self):
        # Successful login as admin
        login_res = self.client.post("/api/login", json={"username": "admin", "password": "admin12345"})
        self.assertEqual(login_res.status_code, 200)
        user_data = json.loads(login_res.data)
        self.assertIn(user_data["role"], ["admin", "super_admin"])

        # Access protected currency rates
        res = self.client.get("/api/currency/rates")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data.get("base"), "KWD")

    def test_auth_failure(self):
        res = self.client.post("/api/login", json={"username": "nonexistent", "password": "wrong"})
        self.assertEqual(res.status_code, 401)

if __name__ == "__main__":
    unittest.main()

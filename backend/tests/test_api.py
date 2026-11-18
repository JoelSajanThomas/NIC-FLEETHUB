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
        self.assertIsInstance(data["fleet"]["total"], int)
        self.assertGreaterEqual(data["fleet"]["total"], 0)

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

    def test_voice_language_detection(self):
        from src.services.voice_translation_service import detect_language
        self.assertEqual(detect_language("I need a vehicle maintenance report."), "en")
        self.assertEqual(detect_language("Cylinder head gasket inspection"), "en")
        self.assertEqual(detect_language("मुझे एक ब्रेक चाहिए।"), "hi")
        self.assertEqual(detect_language("mera gadi kharab ho gaya"), "hi")
        self.assertEqual(detect_language("أحتاج إلى تقرير صيانة السيارة."), "ar")
        self.assertEqual(detect_language("الفحص الفني في الشويخ"), "ar")

    def test_voice_english_speech_preservation(self):
        """Test 1 & 4: English speech recognized and preserved verbatim without unnecessary translation."""
        from src.services.voice_translation_service import translate_text
        phrases = [
            "I need a vehicle maintenance report.",
            "Hydraulic hose burst on Caterpillar wheel loader at Shuwaikh port.",
            "Change oil and replace primary fuel filter before 10000 km."
        ]
        for phrase in phrases:
            trans, code, name = translate_text(phrase)
            self.assertEqual(code, "en")
            self.assertEqual(name, "English")
            self.assertEqual(trans, phrase)

    def test_voice_hindi_speech_translation(self):
        """Test 2 & 5: Hindi speech translated to natural English with numbers preserved."""
        from src.services.voice_translation_service import translate_text
        # Test 2: Standard conversational sentence
        trans, code, name = translate_text("मुझे एक ब्रेक चाहिए।")
        self.assertEqual(code, "hi")
        self.assertEqual(name, "Hindi")
        self.assertTrue("break" in trans.lower() or "need" in trans.lower(), f"Unexpected: {trans}")

        # Test 5: Hindi with numbers and amounts preserved
        trans_num, code_num, _ = translate_text("मुझे 50 लीटर तेल और 3 फिल्टर चाहिए")
        self.assertEqual(code_num, "hi")
        self.assertIn("50", trans_num)
        self.assertIn("3", trans_num)

    def test_voice_arabic_speech_translation(self):
        """Test 3 & 6: Arabic speech translated to natural English with dates and numbers preserved."""
        from src.services.voice_translation_service import translate_text
        # Test 3: Standard sentence
        trans, code, name = translate_text("أحتاج إلى تقرير صيانة السيارة.")
        self.assertEqual(code, "ar")
        self.assertEqual(name, "Arabic")
        self.assertTrue("maintenance" in trans.lower() or "report" in trans.lower() or "car" in trans.lower() or "vehicle" in trans.lower(), f"Unexpected: {trans}")

        # Test 6: Arabic with dates and numbers preserved
        trans_date, code_date, _ = translate_text("تاريخ الفحص الفني هو 2026-11-20 للمركبة رقم 42")
        self.assertEqual(code_date, "ar")
        self.assertTrue("2026-11-20" in trans_date or "2026" in trans_date, f"Unexpected date: {trans_date}")
        self.assertIn("42", trans_date)

    def test_voice_process_api_endpoint(self):
        """Test /api/voice/process endpoint."""
        # Log in first
        self.client.post("/api/login", json={"username": "admin", "password": "admin12345"})
        res = self.client.post("/api/voice/process", data={
            "transcript": "Engine overheating at Shuwaikh worksite",
            "lang": "en"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["detected_lang"], "en")
        self.assertEqual(data["detected_lang_name"], "English")
        self.assertIn("Engine overheating", data["english_translation"])

    def test_purchase_document_validation(self):
        """Test purchase document file validation: allowed formats (.pdf, .jpg, .jpeg, .png, .webp)."""
        from unittest.mock import MagicMock
        from src.controllers.purchase_controller import validate_purchase_file
        from src.middleware.error_middleware import Bad

        # Allowed formats
        for allowed in ["invoice.pdf", "bill.jpg", "receipt.jpeg", "scan.png", "doc.webp"]:
            mock_file = MagicMock()
            mock_file.filename = allowed
            ext = validate_purchase_file(mock_file)
            self.assertTrue(ext.startswith("."))

        # Disallowed formats
        for disallowed in ["malicious.exe", "script.sh", "notes.txt", "archive.zip"]:
            mock_bad = MagicMock()
            mock_bad.filename = disallowed
            with self.assertRaises(Bad):
                validate_purchase_file(mock_bad)

if __name__ == "__main__":
    unittest.main()

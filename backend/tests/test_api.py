"""Basic API and database unit tests for NIC FleetHub Backend."""
import unittest, json, os
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
        self.assertTrue(bool(data.get("ai_description")))

    def test_unknown_api_route_bug_resolved(self):
        """Module 1 Verification: Test that /voice/process, /api/voice/process, and duplicate /api/api/ paths all resolve successfully without 404 Unknown API route."""
        self.client.post("/api/login", json={"username": "admin", "password": "admin12345"})

        # 1. Alias route without /api prefix
        res1 = self.client.post("/voice/process", data={"transcript": "Test audio voice check", "lang": "en"})
        self.assertEqual(res1.status_code, 200)

        # 2. Standard route with /api prefix
        res2 = self.client.post("/api/voice/process", data={"transcript": "Test audio voice check", "lang": "en"})
        self.assertEqual(res2.status_code, 200)

        # 3. Duplicate prefix /api/api/ path handled by normalizer
        res3 = self.client.post("/api/api/voice/process", data={"transcript": "Test audio voice check", "lang": "en"})
        self.assertEqual(res3.status_code, 200)

    def test_ai_description_generation_engine(self):
        """Module 3 Verification: Professional description generation for fleet engineering."""
        from src.services.voice_translation_service import generate_professional_description

        # Brakes
        desc_brake = generate_professional_description("Vehicle brakes making grinding noise, check required", lang="en")
        self.assertIn("brake", desc_brake.lower())
        self.assertIn("inspection", desc_brake.lower())

        # Overheating
        desc_heat = generate_professional_description("Engine temperature is extremely high with steam", lang="en")
        self.assertIn("thermal", desc_heat.lower())

        # Fluid leakage
        desc_leak = generate_professional_description("Hydraulic oil leaking under the chassis", lang="en")
        self.assertIn("leakage", desc_leak.lower())

    def test_audio_file_persistence_and_retrieval(self):
        """Module 4 Verification: Audio file permanent persistence, database metadata, and retrieval."""
        import io
        self.client.post("/api/login", json={"username": "admin", "password": "admin12345"})

        fake_audio = io.BytesIO(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00data\x00\x00\x00\x00")
        res = self.client.post("/api/voice/process", data={
            "audio": (fake_audio, "driver_report.wav"),
            "transcript": "Front axle unusual noise during operation",
            "lang": "en",
            "duration": 4.5,
            "module": "complaint"
        }, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        doc_id = data.get("doc_id")
        self.assertIsNotNone(doc_id)
        self.assertIsNotNone(data.get("stored_filename"))
        self.assertEqual(data.get("duration"), 4.5)

        # Retrieve file via /api/files/<doc_id>
        file_res = self.client.get(f"/api/files/{doc_id}")
        self.assertEqual(file_res.status_code, 200)
        self.assertGreater(len(file_res.data), 0)

    def test_complaint_and_work_order_with_voice_integration(self):
        """Module 5 & 4: Link voice audio and AI description directly to business records."""
        self.client.post("/api/login", json={"username": "admin", "password": "admin12345"})

        # 1. First process voice
        voice_res = self.client.post("/api/voice/process", data={
            "transcript": "गाड़ी में ब्रेक की समस्या है और इसकी जांच करनी है।",
            "lang": "hi",
            "module": "complaint"
        })
        self.assertEqual(voice_res.status_code, 200)
        vdata = json.loads(voice_res.data)
        doc_id = vdata.get("doc_id")

        # 2. Get registered asset
        assets_res = self.client.get("/api/assets")
        self.assertEqual(assets_res.status_code, 200)
        assets = json.loads(assets_res.data)
        self.assertTrue(len(assets) > 0)
        aid = assets[0]["id"]

        # 3. Create complaint with voice metadata
        comp_res = self.client.post("/api/complaints", data={
            "asset_id": aid,
            "category": "Brake Problem",
            "description": vdata["english_translation"],
            "ai_description": vdata["ai_description"],
            "voice_doc_id": doc_id or "",
            "original_lang": vdata["detected_lang"],
            "original_transcript": vdata["original_transcript"],
            "priority": "High"
        })
        self.assertEqual(comp_res.status_code, 200)
        cdata = json.loads(comp_res.data)
        self.assertIn("CMP-", cdata["code"])

        # 4. Verify complaint list contains complaint with audio_id
        list_res = self.client.get("/api/complaints")
        self.assertEqual(list_res.status_code, 200)
        complaints = json.loads(list_res.data)
        found = next((c for c in complaints if c["id"] == cdata["id"]), None)
        self.assertIsNotNone(found)
        self.assertIn("brake", found["description"].lower())
        self.assertIn("brake", found["ai_description"].lower())

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

    def test_document_ai_multilingual_extraction(self):
        """Test AI document recognition, language detection & translation across EN, HI, AR."""
        from src.services.document_ai_service import process_document

        # 1. English
        en_text = """
        INVOICE
        Supplier: Al-Ghanim Heavy Equipment Co.
        Invoice No: INV-2026-9041
        Date: 2026-11-18
        Item Description: Caterpillar Hydraulic Filter Element
        Qty: 4
        Unit Price: 15.500
        Grand Total: 62.000 KWD
        """
        res_en = process_document(en_text.encode('utf-8'), 'invoice.txt', 'purchase')
        self.assertEqual(res_en["detected_lang"], "en")
        self.assertEqual(res_en["fields"]["invoice_no"]["value"], "INV-2026-9041")
        self.assertEqual(res_en["fields"]["total_amount"]["value"], 62.0)
        self.assertTrue(res_en["calculations_verified"])

        # 2. Hindi (Auto-detect & translate to English)
        hi_text = """
        कर चालान (Tax Invoice)
        विक्रेता: शर्मा मोटर्स
        चालान संख्या: SH-7782
        दिनांक: 18/11/2026
        सामग्री विवरण: ब्रेक पैड सेट
        मात्रा: 2
        इकाई मूल्य: 25.000
        कुल राशि: 50.000
        """
        res_hi = process_document(hi_text.encode('utf-8'), 'hindi_bill.txt', 'purchase')
        self.assertEqual(res_hi["detected_lang"], "hi")
        self.assertEqual(res_hi["fields"]["invoice_no"]["value"], "SH-7782")
        self.assertEqual(res_hi["fields"]["total_amount"]["value"], 50.0)
        self.assertIn("Sharma Motors", res_hi["fields"]["supplier"]["value"])
        self.assertTrue(res_hi["calculations_verified"])

        # 3. Arabic (Auto-detect & translate to English)
        ar_text = """
        فاتورة ضريبية
        المورد: مؤسسة الصليبية لقطع الغيار
        رقم الفاتورة: KUW-55410
        التاريخ: 2026-11-18
        بيان الأصناف: زيت محرك هيدروليك 20 لتر
        الكمية: 5
        سعر الوحدة: 8.000
        المجموع الكلي: 40.000 د.ك
        """
        res_ar = process_document(ar_text.encode('utf-8'), 'arabic_invoice.txt', 'purchase')
        self.assertEqual(res_ar["detected_lang"], "ar")
        self.assertEqual(res_ar["fields"]["invoice_no"]["value"], "KUW-55410")
        self.assertEqual(res_ar["fields"]["total_amount"]["value"], 40.0)
        self.assertIn("Sulaibiya", res_ar["fields"]["supplier"]["value"])
        self.assertTrue(res_ar["calculations_verified"])

    def test_document_ai_scan_api_endpoint(self):
        """Test /api/documents/scan-autofill endpoint."""
        import io, pymupdf
        # Log in first
        self.client.post("/api/login", json={"username": "admin", "password": "admin12345"})

        # Create real PDF in memory
        doc = pymupdf.open()
        page = doc.new_page()
        page.insert_text((50, 72), "INVOICE\nSupplier: Gulf Heavy Machinery\nInvoice No: GHM-1200\nDate: 2026-11-18\nTotal: 100.000 KWD", fontsize=12)
        pdf_bytes = doc.tobytes()
        doc.close()

        res = self.client.post("/api/documents/scan-autofill", data={
            "file": (io.BytesIO(pdf_bytes), "invoice.pdf"),
            "context": "purchase"
        }, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data["success"])
        self.assertEqual(data["detected_lang"], "en")
        self.assertIn("invoice_no", data["fields"])
        self.assertEqual(data["fields"]["invoice_no"]["value"], "GHM-1200")

    def test_live_data_synchronization_triggers(self):
        """Test that data mutations trigger sync version increments and update public stats."""
        from src.services.sync_service import get_sync_version
        
        v_before = get_sync_version()
        login_res = self.client.post("/api/login", json={"username": "admin", "password": "admin12345"})
        self.assertEqual(login_res.status_code, 200)
        
        # 1. Register a new asset
        res = self.client.post("/api/assets", json={
            "name": "Sync Test Bulldozer CAT D8T",
            "category": "Bulldozer",
            "status": "Active"
        })
        self.assertEqual(res.status_code, 200)
        v_after_asset = get_sync_version()
        self.assertGreater(v_after_asset, v_before)
        
        # 2. Check public stats immediately reflects the new asset
        res_stats = self.client.get("/api/public/stats")
        self.assertEqual(res_stats.status_code, 200)
        stats = json.loads(res_stats.data)
        self.assertGreaterEqual(stats["fleet"]["total"], 1)
        self.assertEqual(stats["version"], v_after_asset)

    def tearDown(self):
        super().tearDown()
        # Clean any test-created voice files
        upload_audio_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "audio")
        if os.path.exists(upload_audio_dir):
            for fn in os.listdir(upload_audio_dir):
                if fn.startswith("voice_") and fn.endswith(".wav"):
                    try:
                        os.remove(os.path.join(upload_audio_dir, fn))
                    except Exception:
                        pass
        # Clean any test-created records from database
        try:
            from src.database.connection import tx
            with self.app.app_context():
                with tx() as c:
                    c.execute("DELETE FROM complaints WHERE code LIKE 'CMP-000%'")
                    c.execute("DELETE FROM work_orders WHERE code LIKE 'WO-000%'")
                    c.execute("DELETE FROM assets WHERE name LIKE 'Sync Test%'")
                    c.execute("DELETE FROM notifications WHERE title LIKE '%CMP-000%'")
        except Exception:
            pass

if __name__ == "__main__":
    unittest.main()

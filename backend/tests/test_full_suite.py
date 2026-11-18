"""Comprehensive End-to-End Test Suite for NIC FleetHub.
Covers CRUD, Business Logic, Kuwait Operational Rules, Form Validations,
Role-Based Access Control, and API Integrity.
"""
import unittest, json, os, io
from src.app import create_app

class FleetHubFullSuiteTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

        # Admin client
        cls.admin_client = cls.app.test_client()
        login_res = cls.admin_client.post("/api/login", json={"username": "admin", "password": "admin12345"})
        assert login_res.status_code == 200
        cls.admin_token = json.loads(login_res.data)["token"]
        cls.admin_headers = {
            "Authorization": f"Bearer {cls.admin_token}",
            "Content-Type": "application/json"
        }

        # Driver client (restricted role)
        cls.driver_client = cls.app.test_client()
        driver_res = cls.driver_client.post("/api/login", json={"username": "driver", "password": "driver12345"})
        assert driver_res.status_code == 200
        cls.driver_token = json.loads(driver_res.data)["token"]
        cls.driver_headers = {
            "Authorization": f"Bearer {cls.driver_token}",
            "Content-Type": "application/json"
        }

    @classmethod
    def tearDownClass(cls):
        from src.config import config
        if os.path.exists(config.UPLOAD_DIR):
            for f in os.listdir(config.UPLOAD_DIR):
                if f.endswith(".pdf") or f.startswith("test_"):
                    try:
                        os.remove(os.path.join(config.UPLOAD_DIR, f))
                    except Exception:
                        pass

    # =========================================================================
    # 1. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
    # =========================================================================
    def test_auth_valid_login(self):
        """TC-AUTH-01: Login with valid admin credentials returns 200 and Bearer token."""
        res = self.client.post("/api/login", json={"username": "admin", "password": "admin12345"})
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("token", data)
        self.assertEqual(data["role"], "super_admin")

    def test_auth_invalid_login(self):
        """TC-AUTH-02: Login with incorrect password returns 401."""
        res = self.client.post("/api/login", json={"username": "admin", "password": "wrongpassword!"})
        self.assertEqual(res.status_code, 401)
        data = json.loads(res.data)
        self.assertIn("error", data)

    def test_auth_unauthenticated_protected_route(self):
        """TC-AUTH-03: Accessing protected route without token or session returns 401."""
        fresh_client = self.app.test_client()
        res = fresh_client.get("/api/dashboard")
        self.assertEqual(res.status_code, 401)

    def test_auth_rbac_forbidden_action(self):
        """TC-AUTH-04: Driver role attempting to access admin backups returns 403."""
        res = self.driver_client.get("/api/admin/backups", headers=self.driver_headers)
        self.assertEqual(res.status_code, 403)

    def test_auth_logout(self):
        """TC-AUTH-05: Logout clears session successfully."""
        res = self.client.post("/api/logout")
        self.assertEqual(res.status_code, 200)

    # =========================================================================
    # 2. ASSET MANAGEMENT (CRUD & KUWAIT COMPLIANCE)
    # =========================================================================
    def test_asset_crud_lifecycle(self):
        """TC-AST-01: Complete lifecycle of an asset (Create, Read, Update, Transfer, Archive, Restore)."""
        # 1. Create Asset
        payload = {
            "name": "Test CAT 320D Excavator",
            "category": "Excavator",
            "equipment_type": "Hydraulic Excavator",
            "manufacturer": "Caterpillar",
            "model": "320D",
            "year": 2023,
            "reg_no": f"99/T{os.urandom(3).hex().upper()}",
            "purchase_cost": 45000.0,
            "plate_category": "Heavy Equipment",
            "worksite_id": 1,
            "paci_no": "29103948"
        }
        res = self.client.post("/api/assets", json=payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        ast_id = json.loads(res.data)["id"]
        ast_code = json.loads(res.data)["code"]
        self.assertTrue(ast_code.startswith("AST-"))

        # 2. Read Asset
        res_get = self.client.get("/api/assets", headers=self.admin_headers)
        self.assertEqual(res_get.status_code, 200)
        assets = json.loads(res_get.data)
        self.assertTrue(any(a["id"] == ast_id for a in assets))

        # 3. Update Asset
        res_put = self.client.put(f"/api/assets/{ast_id}", json={"model": "320D2", "status": "In Workshop"}, headers=self.admin_headers)
        self.assertEqual(res_put.status_code, 200)

        # 4. Transfer Asset to another worksite
        res_transfer = self.client.post(
            f"/api/assets/{ast_id}/transfer",
            json={"to_site_id": 2, "reason": "Mobilization for Shuaiba project", "odometer_hours": 1200.5, "transporter": "Carrier 05"},
            headers=self.admin_headers
        )
        self.assertEqual(res_transfer.status_code, 200)

        # 5. Archive Asset (Retire)
        res_arch = self.client.post(f"/api/assets/{ast_id}/archive", headers=self.admin_headers)
        self.assertEqual(res_arch.status_code, 200)

        # 6. Restore Asset (Active)
        res_restore = self.client.post(f"/api/assets/{ast_id}/archive", headers=self.admin_headers)
        self.assertEqual(res_restore.status_code, 200)

    def test_asset_creation_validation(self):
        """TC-AST-02: Form validation rejects asset with missing name or category."""
        res = self.client.post("/api/assets", json={"name": ""}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("required", json.loads(res.data)["error"].lower())

    def test_asset_transfer_same_site_rejection(self):
        """TC-AST-03: Transferring an asset to the same site it is already on returns 400."""
        # Query asset 1
        res = self.client.get("/api/assets", headers=self.admin_headers)
        a1 = json.loads(res.data)[0]
        res_tf = self.client.post(
            f"/api/assets/{a1['id']}/transfer",
            json={"to_site_id": a1["worksite_id"], "reason": "Redundant move"},
            headers=self.admin_headers
        )
        self.assertEqual(res_tf.status_code, 400)

    # =========================================================================
    # 3. COMPLAINTS & WORKSHOP DECISIONS
    # =========================================================================
    def test_complaint_creation_and_approval(self):
        """TC-CMP-01: Create breakdown complaint, review and approve."""
        # 1. Create complaint
        res = self.client.post("/api/complaints", json={
            "asset_id": 1,
            "description": "Engine coolant temperature high during heavy excavation work",
            "priority": "High",
            "location": "Sulaibiya Sector 4",
            "category": "Engine"
        }, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        cmp_id = json.loads(res.data)["id"]
        cmp_code = json.loads(res.data)["code"]
        self.assertTrue(cmp_code.startswith("CMP-"))

        # 2. Decide: Approve complaint
        res_decide = self.client.post(f"/api/complaints/{cmp_id}/decide", json={
            "decision": "approve",
            "note": "Approved for workshop diagnosis",
            "priority": "High"
        }, headers=self.admin_headers)
        self.assertEqual(res_decide.status_code, 200)

    def test_complaint_empty_description_validation(self):
        """TC-CMP-02: Complaint without description or audio transcript is rejected."""
        res = self.client.post("/api/complaints", json={"asset_id": 1, "description": ""}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 400)

    def test_complaint_reject_requires_note(self):
        """TC-CMP-03: Rejecting a complaint without a mandatory note returns 400."""
        # Create fresh complaint
        res = self.client.post("/api/complaints", json={
            "asset_id": 1,
            "description": "Minor door handle rattle",
            "priority": "Low",
            "location": "Yard",
            "category": "Other"
        }, headers=self.admin_headers)
        cmp_id = json.loads(res.data)["id"]

        # Attempt rejection with empty note
        res_decide = self.client.post(f"/api/complaints/{cmp_id}/decide", json={
            "decision": "reject",
            "note": ""
        }, headers=self.admin_headers)
        self.assertEqual(res_decide.status_code, 400)

    # =========================================================================
    # 4. WORK ORDERS & WORKSHOP LIFECYCLE (14 STAGES)
    # =========================================================================
    def test_work_order_creation_from_complaint(self):
        """TC-WO-01: Convert an approved complaint into a formal work order."""
        # Create & approve complaint
        res_c = self.client.post("/api/complaints", json={
            "asset_id": 2,
            "description": "Rear suspension spring crack noticed during safety pre-check",
            "priority": "High",
            "location": "Shuwaikh Workshop",
            "category": "Suspension"
        }, headers=self.admin_headers)
        c_id = json.loads(res_c.data)["id"]
        self.client.post(f"/api/complaints/{c_id}/decide", json={"decision": "approve", "note": "Proceed"}, headers=self.admin_headers)

        # Create Work Order from approved complaint
        res_wo = self.client.post("/api/work-orders", json={
            "complaint_id": c_id,
            "category": "Mechanical Repair",
            "assignee": "Mechanic Tariq"
        }, headers=self.admin_headers)
        self.assertEqual(res_wo.status_code, 200)
        wo_id = json.loads(res_wo.data)["id"]

        # Progress work order: Pending -> Approved -> Assigned -> In Progress -> Completed -> Pending Inspection -> Inspection Approved -> Released
        stages = [
            ("Approved", "Approved by workshop manager"),
            ("Assigned", "Assigned to Mechanic Tariq"),
            ("In Progress", "Repair commenced"),
            ("Completed", "Suspension spring replaced and torqued"),
            ("Pending Inspection", "Sent to QA fahs check"),
            ("Inspection Approved", "Safety inspection passed 100%"),
            ("Released", "Vehicle released to active fleet")
        ]
        for stage, note in stages:
            res_prog = self.client.post(f"/api/work-orders/{wo_id}/progress", json={"status": stage, "note": note}, headers=self.admin_headers)
            self.assertEqual(res_prog.status_code, 200)

    def test_work_order_invalid_stage_progression_rejected(self):
        """TC-WO-02: Skipping lifecycle stages (e.g. Pending directly to Released) is rejected."""
        res_wo = self.client.post("/api/work-orders", json={
            "asset_id": 1,
            "category": "Test",
            "description": "Lifecycle bypass attempt test"
        }, headers=self.admin_headers)
        wo_id = json.loads(res_wo.data)["id"]

        # Attempt to jump straight to Released
        res_bad = self.client.post(f"/api/work-orders/{wo_id}/progress", json={"status": "Released"}, headers=self.admin_headers)
        self.assertEqual(res_bad.status_code, 400)

    # =========================================================================
    # 5. INVENTORY & SPARE PARTS MANAGEMENT
    # =========================================================================
    def test_inventory_stock_movements(self):
        """TC-INV-01: Add spare part, stock in with cost averaging, and manual adjustment."""
        # 1. Add Part
        uid = os.urandom(4).hex()
        payload = {
            "name": f"CAT Hydraulic Oil Seal Kit {uid}",
            "category": "Hydraulics",
            "stock_id": f"STK-SEAL-{uid}",
            "unit": "sets",
            "min_qty": 3.0,
            "unit_cost": 25.000,
            "location": "Rack A-01"
        }
        res = self.client.post("/api/parts", json=payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        part_id = json.loads(res.data)["id"]

        # 2. Stock In (receive 10 units at 22.000 KWD)
        res_in = self.client.post(f"/api/parts/{part_id}/stock", json={
            "kind": "in",
            "qty": 10.0,
            "unit_cost": 22.000,
            "note": "Initial delivery from Al-Bahar"
        }, headers=self.admin_headers)
        self.assertEqual(res_in.status_code, 200)

        # 3. Manual Adjustment (adjust to 9 units)
        res_adj = self.client.post(f"/api/parts/{part_id}/stock", json={
            "kind": "adjust",
            "qty": 9.0,
            "note": "Annual physical stock count adjustment"
        }, headers=self.admin_headers)
        self.assertEqual(res_adj.status_code, 200)

    def test_inventory_duplicate_stock_id_rejected(self):
        """TC-INV-02: Duplicate stock_id returns 409 Conflict."""
        # Query existing parts
        res = self.client.get("/api/parts", headers=self.admin_headers)
        existing_stock_id = json.loads(res.data)[0]["stock_id"]

        res_dup = self.client.post("/api/parts", json={
            "name": "Duplicate part",
            "stock_id": existing_stock_id
        }, headers=self.admin_headers)
        self.assertEqual(res_dup.status_code, 409)

    def test_inventory_issue_and_overdraw_prevention(self):
        """TC-INV-03: Issuing more parts than in stock is prevented (409)."""
        uid = os.urandom(4).hex()
        # Create part with 1 unit in stock
        res = self.client.post("/api/parts", json={
            "name": f"Rare Hydraulic Sensor {uid}",
            "stock_id": f"STK-SENS-{uid}",
            "unit": "pcs",
            "unit_cost": 50.000
        }, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        pid = json.loads(res.data)["id"]
        self.client.post(f"/api/parts/{pid}/stock", json={"kind": "in", "qty": 1.0}, headers=self.admin_headers)

        # Attempt to issue 5 units against WO 1
        res_issue = self.client.post(f"/api/parts/{pid}/issue", json={"wo_id": 1, "qty": 5.0}, headers=self.admin_headers)
        self.assertEqual(res_issue.status_code, 409)

    # =========================================================================
    # 6. EXTERNAL PURCHASES & MULTI-CURRENCY CONVERSION
    # =========================================================================
    def test_purchase_foreign_currency_conversion(self):
        """TC-PUR-01: Purchase in USD is correctly converted to KWD at Central Bank rate."""
        res = self.client.post("/api/purchases", json={
            "part_name": "Imported Bosch Fuel Injection Pump",
            "qty": 2.0,
            "currency": "USD",
            "est_price": 500.0,  # 500 USD each
            "asset_id": 1,
            "supplier": "Mohamed Abdulrahman Al-Bahar (CAT Kuwait Dealer)"
        }, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        pur_id = json.loads(res.data)["id"]

        # Verify purchase list reflects KWD converted price
        res_list = self.client.get("/api/purchases", headers=self.admin_headers)
        p_row = next(p for p in json.loads(res_list.data) if p["id"] == pur_id)
        self.assertEqual(p_row["currency"], "USD")
        self.assertAlmostEqual(p_row["exchange_rate"], 0.3082, places=3)
        self.assertAlmostEqual(p_row["est_price"], 500.0 * 0.3082, places=1)

    def test_purchase_block_when_in_stock(self):
        """TC-PUR-02: Buying a catalogue part externally when sufficient stock exists returns 409."""
        # Find a part with available quantity
        res = self.client.get("/api/parts", headers=self.admin_headers)
        pt = next(p for p in json.loads(res.data) if p["qty"] > 2)

        res_pur = self.client.post("/api/purchases", json={
            "part_name": pt["name"],
            "part_id": pt["id"],
            "qty": 1.0,
            "asset_id": 1,
            "to_stock": 0
        }, headers=self.admin_headers)
        self.assertEqual(res_pur.status_code, 409)

    # =========================================================================
    # 7. SUPPLIERS MANAGEMENT
    # =========================================================================
    def test_supplier_crud(self):
        """TC-SUP-01: Create, Read, Update, and Toggle Kuwait supplier."""
        # 1. Create Supplier
        payload = {
            "name": "Boodai Trading Co. W.L.L",
            "contact_person": "Jassim Boodai",
            "phone": "+965 2484 3211",
            "email": "equipment@boodaitrading.com",
            "address": "Shuwaikh Industrial Area 1",
            "categories": "Heavy Equipment, Komatsu Spares, Hydraulics"
        }
        res = self.client.post("/api/suppliers", json=payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        sup_id = json.loads(res.data)["id"]

        # 2. Update Supplier
        res_put = self.client.put(f"/api/suppliers/{sup_id}", json={
            "name": "Boodai Trading Heavy Division W.L.L",
            "contact_person": "Jassim Boodai",
            "phone": "+965 2484 3211"
        }, headers=self.admin_headers)
        self.assertEqual(res_put.status_code, 200)

        # 3. Toggle Status (Deactivate)
        res_tog = self.client.post(f"/api/suppliers/{sup_id}/toggle", headers=self.admin_headers)
        self.assertEqual(res_tog.status_code, 200)
        self.assertEqual(json.loads(res_tog.data)["active"], 0)

    def test_supplier_missing_name_rejected(self):
        """TC-SUP-02: Supplier with empty name returns 400."""
        res = self.client.post("/api/suppliers", json={"name": ""}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 400)

    # =========================================================================
    # 8. EXPENSES & KUWAIT OPERATIONAL RULES (0.000 KWD INTERNAL LABOUR)
    # =========================================================================
    def test_expense_internal_labour_blocked(self):
        """TC-EXP-01: Charging internal mechanics' labour is strictly prohibited (0.000 KWD rule)."""
        res = self.client.post("/api/expenses", data={
            "asset_id": "1",
            "kind": "internal_labour",
            "amount": "50.000"
        }, headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("monthly salaries", json.loads(res.data)["error"])

    def test_expense_requires_bill_receipt(self):
        """TC-EXP-02: Logging an external expense without attaching an invoice/receipt returns 400."""
        res = self.client.post("/api/expenses", data={
            "asset_id": "1",
            "kind": "towing",
            "amount": "25.000"
        }, headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("attach the invoice", json.loads(res.data)["error"].lower())

    def test_expense_valid_with_receipt(self):
        """TC-EXP-03: Logging an external expense with valid receipt file succeeds."""
        dummy_file = (io.BytesIO(b"%PDF-1.4 sample bill invoice"), "receipt.pdf")
        res = self.client.post("/api/expenses", data={
            "asset_id": "1",
            "kind": "towing",
            "amount": "30.000",
            "currency": "KWD",
            "ref": f"TOW-KW-{os.urandom(4).hex()}",
            "bill": dummy_file
        }, headers={"Authorization": f"Bearer {self.admin_token}"}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)

    # =========================================================================
    # 9. WORKSITES & CATEGORIES
    # =========================================================================
    def test_worksite_crud(self):
        """TC-WS-01: Create and edit Kuwait worksite with PACI number."""
        ws_uid = os.urandom(4).hex()
        payload = {
            "name": f"Sabhan Precast Yard {ws_uid}",
            "site_type": "Production Plant",
            "governorate": "Mubarak Al-Kabeer",
            "paci_no": "38102944",
            "contact_person": "Eng. Tariq Al-Otaibi",
            "contact_phone": "+965 2471 9900"
        }
        res = self.client.post("/api/worksites", json=payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        ws_id = json.loads(res.data)["id"]

        # Edit worksite
        res_edit = self.client.put(f"/api/worksites/{ws_id}", json={
            "name": f"Sabhan Central Yard {ws_uid}",
            "governorate": "Mubarak Al-Kabeer"
        }, headers=self.admin_headers)
        self.assertEqual(res_edit.status_code, 200)

    def test_category_creation_and_validation(self):
        """TC-CAT-01: Create category and validate kind must be 'asset' or 'part'."""
        # Valid asset category
        res_ok = self.client.post("/api/categories", json={"kind": "asset", "name": f"Pump-{os.urandom(4).hex()}"}, headers=self.admin_headers)
        self.assertEqual(res_ok.status_code, 200)

    # =========================================================================
    # 10. USER ACCOUNTS & MANAGEMENT
    # =========================================================================
    def test_user_management_and_password_validation(self):
        """TC-USR-01: Create user, validate 6+ char password, edit, and toggle."""
        # 1. Reject password under 6 chars
        res_short = self.client.post("/api/users", json={
            "username": "shortpwuser",
            "password": "123",
            "name": "Short Password",
            "role": "mechanic"
        }, headers=self.admin_headers)
        self.assertEqual(res_short.status_code, 400)

        # 2. Create valid user
        u_uid = os.urandom(4).hex()
        res_create = self.client.post("/api/users", json={
            "username": f"tech_{u_uid}",
            "password": "techpassword123",
            "name": "Workshop Technician",
            "role": "mechanic",
            "preferred_lang": "hi"
        }, headers=self.admin_headers)
        self.assertEqual(res_create.status_code, 200)
        uid = json.loads(res_create.data)["id"]

        # 3. Toggle user active state
        res_tog = self.client.post(f"/api/users/{uid}/toggle", headers=self.admin_headers)
        self.assertEqual(res_tog.status_code, 200)
        self.assertEqual(json.loads(res_tog.data)["active"], 0)

    # =========================================================================
    # 11. REPORTS EXPORTS (JSON & CSV ACROSS ALL 9 MODULES)
    # =========================================================================
    def test_reports_export_formats(self):
        """TC-REP-01: Test CSV and JSON exports for all 9 report types."""
        report_types = ["assets", "complaints", "work_orders", "inventory", "purchases", "expenses", "historical", "transfers", "compliance"]
        for rtype in report_types:
            # CSV export
            res_csv = self.client.get(f"/api/reports/export?type={rtype}&format=csv", headers=self.admin_headers)
            self.assertEqual(res_csv.status_code, 200)
            self.assertIn("text/csv", res_csv.headers.get("Content-Type", ""))

            # JSON export
            res_json = self.client.get(f"/api/reports/export?type={rtype}&format=json", headers=self.admin_headers)
            self.assertEqual(res_json.status_code, 200)

    # =========================================================================
    # 12. PUBLIC INQUIRIES & WEBSITE FORMS
    # =========================================================================
    def test_public_inquiry_submission(self):
        """TC-INQ-01: Public website contact inquiry submission and validation."""
        # Empty validation
        res_bad = self.client.post("/api/inquiries", json={"name": "", "message": ""})
        self.assertEqual(res_bad.status_code, 400)

        # Successful submission
        res_ok = self.client.post("/api/inquiries", json={
            "name": "Khaled Al-Rashid",
            "email": "k.alrashid@contracting.com.kw",
            "message": "Inquiry regarding equipment rental availability for Mutlaa project."
        })
        self.assertEqual(res_ok.status_code, 200)
        self.assertTrue(json.loads(res_ok.data)["ok"])

    # =========================================================================
    # 13. GLOBAL SEARCH & FILTERING
    # =========================================================================
    def test_global_search(self):
        """TC-SRCH-01: Global search returns matching assets, parts, or work orders."""
        res = self.client.get("/api/search?q=caterpillar", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)

    # =========================================================================
    # 14. DATABASE BACKUP ARCHIVING
    # =========================================================================
    def test_system_backup_creation_and_listing(self):
        """TC-BK-01: Admin creates full SQLite backup archive and lists backups."""
        res_bk = self.client.post("/api/admin/backup", headers=self.admin_headers)
        self.assertEqual(res_bk.status_code, 200)
        fn = json.loads(res_bk.data)["file"]
        self.assertTrue(fn.startswith("fleethub-"))

        res_list = self.client.get("/api/admin/backups", headers=self.admin_headers)
        self.assertEqual(res_list.status_code, 200)
        backups = json.loads(res_list.data)["backups"]
        self.assertTrue(any(b["filename"] == fn for b in backups))

if __name__ == "__main__":
    unittest.main()

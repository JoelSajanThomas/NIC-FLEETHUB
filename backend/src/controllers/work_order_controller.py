"""Work orders management controller."""
import os
from flask import Blueprint, jsonify, request, session
from ..database.connection import one, rows, tx, audit, notify
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need, can
from ..services.voice_translation_service import translate_text, generate_professional_description
from .asset_controller import save_file
from ..utils.helpers import P, now

work_order_bp = Blueprint("work_orders", __name__)

PRI = ("Low", "Normal", "High", "Critical")
NEXT = {
    "Pending": ["Awaiting Approval", "Approved", "Assigned", "Cancelled", "Rejected"],
    "Awaiting Approval": ["Approved", "Rejected"],
    "Approved": ["Assigned", "Cancelled"],
    "Assigned": ["In Progress", "Cancelled"],
    "In Progress": ["Waiting for Spare Parts", "Waiting for External Purchase", "Additional Work Required", "Completed"],
    "Waiting for Spare Parts": ["In Progress"],
    "Waiting for External Purchase": ["In Progress"],
    "Additional Work Required": ["In Progress"],
    "Completed": ["Pending Inspection"],
    "Pending Inspection": ["Inspection Approved", "In Progress"],
    "Inspection Approved": ["Released"]
}
MANAGE_ONLY = {"Approved", "Rejected", "Assigned", "Cancelled", "Inspection Approved", "Released"}

@work_order_bp.post("/api/work-orders")
@work_order_bp.post("/work-orders")
@need("wo.manage")
def wo_new():
    p = P()
    cid = int(p["complaint_id"]) if p.get("complaint_id") else None
    orig_text = (p.get("original_transcript") or "").strip()
    orig_lang = (p.get("original_lang") or "").strip().lower() or None
    voice_id = int(p["voice_doc_id"]) if p.get("voice_doc_id") else None
    ai_desc = (p.get("ai_description") or "").strip()
    with tx() as c:
        pri = p.get("priority") if p.get("priority") in PRI else "Normal"
        desc = (p.get("description") or "").strip()
        if cid:
            cm = c.execute("SELECT * FROM complaints WHERE id=?", (cid,)).fetchone()
            if not cm: raise Bad("Complaint not found", 404)
            if cm["status"] != "Approved": raise Bad("Only approved complaints can become work orders")
            aid, pri, desc = cm["asset_id"], cm["priority"], desc or cm["description"]
            voice_id = voice_id or cm["voice_doc_id"]
            orig_text = orig_text or cm["original_transcript"]
            orig_lang = orig_lang or cm["original_lang"]
            ai_desc = ai_desc or cm.get("ai_description") or ""
            c.execute("UPDATE complaints SET status='Work Order Created' WHERE id=?", (cid,))
        else:
            aid = int(p.get("asset_id") or 0)
        if not c.execute("SELECT 1 FROM assets WHERE id=?", (aid,)).fetchone():
            raise Bad("Choose a registered asset")
        if not desc and orig_text:
            desc, det, _ = translate_text(orig_text, target="en")
            orig_lang = orig_lang or det
        if not desc: raise Bad("Describe the work")
        if not ai_desc:
            ai_desc = generate_professional_description(desc, lang=orig_lang or "en", module="work_order")
        is_d_row = c.execute("SELECT is_demo FROM assets WHERE id=?", (aid,)).fetchone()
        is_demo_val = 1 if (is_d_row and is_d_row[0]) else 0
        cur = c.execute(
            "INSERT INTO work_orders(asset_id,complaint_id,category,description,priority,assignee,voice_doc_id,original_lang,original_transcript,ai_description,created_by,is_demo,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (aid, cid, p.get("category") or "Repair", desc, pri, p.get("assignee") or None, voice_id, orig_lang if orig_lang and orig_lang != "en" else None, orig_text if orig_text and orig_text != desc else None, ai_desc, session["name"], is_demo_val, now())
        )
        code = f"WO-{cur.lastrowid:05d}"
        c.execute("UPDATE work_orders SET code=? WHERE id=?", (code, cur.lastrowid))
        if voice_id:
            c.execute("UPDATE documents SET wo_id=?, ai_description=? WHERE id=?", (cur.lastrowid, ai_desc, voice_id))
        audit("create", "work order", code, desc[:80])
        notify("workshop", f"New work order {code}", f"{desc[:60]} ({pri})", kind="wo", link="#wo")
    return jsonify(id=cur.lastrowid, code=code)

@work_order_bp.get("/api/work-orders")
@work_order_bp.get("/work-orders")
@need("wo.view")
def wo_list():
    sql = """SELECT w.*, a.code asset_code, a.name asset_name,
                    COALESCE(w.voice_doc_id, (SELECT id FROM documents d WHERE d.wo_id=w.id AND (d.kind LIKE 'Voice%' OR d.mime LIKE 'audio%') LIMIT 1)) audio_id
             FROM work_orders w JOIN assets a ON a.id=w.asset_id WHERE 1=1"""
    args = []
    if request.args.get("open"):
        sql += " AND w.status NOT IN ('Released','Rejected','Cancelled')"
    if request.args.get("asset_id"):
        sql += " AND w.asset_id=?"
        args.append(int(request.args["asset_id"]))
    out = rows(sql + " ORDER BY w.id DESC LIMIT 500", args)
    for r in out:
        r["next"] = NEXT.get(r["status"], [])
    return jsonify(out)

@work_order_bp.post("/api/work-orders/<int:i>/status")
@need("wo.update")
def wo_status(i):
    p = P()
    st = p.get("status")
    note = (p.get("note") or "").strip()
    orig_note = (p.get("original_transcript") or "").strip()
    if not note and orig_note:
        note, _ = translate_text(orig_note, target="en")
    with tx() as c:
        w = c.execute("SELECT * FROM work_orders WHERE id=?", (i,)).fetchone()
        if not w: raise Bad("Not found", 404)
        if st not in NEXT.get(w["status"], []):
            raise Bad(f"A work order cannot move from {w['status']} to {st}")
        if st in MANAGE_ONLY and not can("wo.manage"):
            raise Bad("This step needs a manager's approval", 403)
        if session["role"] == "mechanic" and (w["assignee"] or "").lower() != session["name"].lower():
            raise Bad("This work order is not assigned to you", 403)
        asg = (p.get("assignee") or w["assignee"] or "").strip() or None
        if st == "Assigned" and not asg:
            raise Bad("Choose who the work is assigned to")
        f = (w["findings"] or "") + (f"\n[{now()} {session['name']}] {note}" if note else "")
        c.execute("""UPDATE work_orders SET status=?,assignee=?,findings=?,started_at=COALESCE(started_at,?),completed_at=COALESCE(?,completed_at),released_at=COALESCE(?,released_at)
                     WHERE id=?""",
                  (st, asg, f.strip() or None, now() if st == "In Progress" else None, now() if st == "Completed" else None, now() if st == "Released" else None, i))
        if st == "In Progress":
            c.execute("UPDATE assets SET status='Under Repair' WHERE id=? AND archived=0", (w["asset_id"],))
        if st == "Released":
            c.execute("UPDATE assets SET status='Active' WHERE id=? AND archived=0", (w["asset_id"],))
        audit("status", "work order", w["code"], f"{w['status']} to {st}")
        if st == "Pending Inspection":
            notify("mechanical", f"{w['code']} pending inspection", f"Work completed by {session['name']}", kind="wo", link="#wo")
        elif st == "Waiting for Spare Parts":
            notify("inventory", f"{w['code']} waiting for parts", f"Asset {w['code']}", kind="wo", link="#wo")
    return jsonify(ok=1)

@work_order_bp.post("/api/work-orders/<int:i>/documents")
@need("wo.update")
def wo_doc_up(i):
    f = request.files.get("file") or request.files.get("photo") or request.files.get("audio")
    if not f: raise Bad("Choose a file")
    kind = P().get("kind") or ("Voice recording" if "audio" in (f.content_type or "") or os.path.splitext(f.filename or "")[1] in (".webm", ".wav", ".mp3") else "Repair photograph")
    with tx() as c:
        w = c.execute("SELECT * FROM work_orders WHERE id=?", (i,)).fetchone()
        if not w: raise Bad("Work order not found", 404)
        d = save_file(c, f, asset_id=w["asset_id"], wo_id=i, kind=kind)
        if kind == "Voice recording":
            c.execute("UPDATE work_orders SET voice_doc_id=? WHERE id=?", (d, i))
        audit("upload", "work order", i, f.filename)
    return jsonify(id=d)

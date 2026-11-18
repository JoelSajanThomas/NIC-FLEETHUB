"""Complaints management controller."""
from flask import Blueprint, jsonify, request, session
from ..database.connection import one, rows, tx, audit, notify
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need, can
from ..services.voice_translation_service import translate_text, generate_professional_description
from .asset_controller import save_file
from ..utils.helpers import P, now

complaint_bp = Blueprint("complaints", __name__)
PRI = ("Low", "Normal", "High", "Critical")

@complaint_bp.post("/api/complaints")
@complaint_bp.post("/complaints")
@need("complaint.create")
def comp_new():
    p = P()
    aid = int(p.get("asset_id") or 0)
    a = one("SELECT * FROM assets WHERE id=? AND archived=0", (aid,))
    if not a: raise Bad("Choose a registered, active asset")
    if session["role"] == "driver" and (a["operator"] or "").lower() != session["name"].lower():
        raise Bad("This asset is not assigned to you", 403)
    desc = (p.get("description") or "").strip()
    orig_text = (p.get("original_transcript") or "").strip()
    orig_lang = (p.get("original_lang") or "").strip().lower() or None
    voice_id = int(p["voice_doc_id"]) if p.get("voice_doc_id") else None
    if not desc and orig_text:
        desc, det, _ = translate_text(orig_text, target="en")
        orig_lang = orig_lang or det
    if not desc: raise Bad("Describe the problem")
    
    ai_desc = (p.get("ai_description") or "").strip()
    if not ai_desc:
        ai_desc = generate_professional_description(desc, lang=orig_lang or "en", module="complaint")

    photo_f = request.files.get("photo") or request.files.get("file")
    audio_f = request.files.get("audio") or request.files.get("voice")
    with tx() as c:
        cur = c.execute(
            "INSERT INTO complaints(asset_id,driver,location,category,description,priority,voice_doc_id,original_lang,original_transcript,ai_description,created_by,is_demo,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (a["id"], session["name"], p.get("location"), p.get("category") or "Other", desc, p.get("priority") if p.get("priority") in PRI else "Normal", voice_id, orig_lang if orig_lang and orig_lang != "en" else None, orig_text if orig_text and orig_text != desc else None, ai_desc, session["name"], a.get("is_demo", 0), now())
        )
        code = f"CMP-{cur.lastrowid:05d}"
        c.execute("UPDATE complaints SET code=? WHERE id=?", (code, cur.lastrowid))
        if voice_id:
            c.execute("UPDATE documents SET complaint_id=?, ai_description=? WHERE id=?", (cur.lastrowid, ai_desc, voice_id))
        if photo_f and photo_f.filename:
            save_file(c, photo_f, asset_id=a["id"], complaint_id=cur.lastrowid, kind="Complaint photograph")
        if audio_f and audio_f.filename:
            v_id = save_file(c, audio_f, asset_id=a["id"], complaint_id=cur.lastrowid, kind="Voice recording")
            c.execute("UPDATE complaints SET voice_doc_id=? WHERE id=?", (v_id, cur.lastrowid))
        audit("create", "complaint", code, desc[:80])
        notify("transport", f"New complaint {code}", f"{desc[:60]} on {a['name']}", kind="complaint", link="#comp")
    return jsonify(id=cur.lastrowid, code=code)

@complaint_bp.get("/api/complaints")
@complaint_bp.get("/complaints")
@need(None)
def comp_list():
    sql = """SELECT c.*, a.code asset_code, a.name asset_name,
                    (SELECT id FROM documents d WHERE d.complaint_id=c.id AND d.kind NOT LIKE 'Voice%' LIMIT 1) photo_id,
                    COALESCE(c.voice_doc_id, (SELECT id FROM documents d WHERE d.complaint_id=c.id AND (d.kind LIKE 'Voice%' OR d.mime LIKE 'audio%') LIMIT 1)) audio_id
             FROM complaints c JOIN assets a ON a.id=c.asset_id"""
    if session["role"] == "driver":
        return jsonify(rows(sql + " WHERE c.created_by=? ORDER BY c.id DESC", (session["name"],)))
    if not (can("asset.view") or can("complaint.review")):
        raise Bad("Not permitted", 403)
    return jsonify(rows(sql + " ORDER BY c.id DESC LIMIT 500"))

@complaint_bp.post("/api/complaints/<int:i>/decide")
@need("complaint.review")
def comp_decide(i):
    p = P()
    d = p.get("decision")
    note = (p.get("note") or "").strip()
    st = {"approve": "Approved", "reject": "Rejected", "info": "Info Requested"}.get(d)
    if not st: raise Bad("Unknown decision")
    if d != "approve" and not note: raise Bad("A reason or question is required")
    with tx() as c:
        r = c.execute("SELECT * FROM complaints WHERE id=?", (i,)).fetchone()
        if not r: raise Bad("Not found", 404)
        if r["status"] not in ("New", "Info Requested"):
            raise Bad("This complaint has already been decided")
        c.execute(
            "UPDATE complaints SET status=?,decided_by=?,decision_note=?,decided_at=?,priority=? WHERE id=?",
            (st, session["name"], note, now(), p.get("priority") if p.get("priority") in PRI else r["priority"], i)
        )
        audit(d, "complaint", r["code"], note)
        if d == "approve":
            notify("mechanical", f"Approved complaint {r['code']}", f"Ready for work order: {r['description'][:60]}", kind="complaint", link="#comp")
        else:
            notify(None, f"Complaint {r['code']} {st}", note or st, kind="complaint", link="#comp")
    return jsonify(ok=1)

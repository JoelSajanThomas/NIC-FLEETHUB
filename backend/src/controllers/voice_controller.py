"""Voice recording processing and translation controller."""
import os, secrets
from flask import Blueprint, jsonify, request, session
from ..config import config
from ..database.connection import tx, audit
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need
from ..services.voice_translation_service import translate_text
from ..utils.helpers import P, now

voice_bp = Blueprint("voice", __name__)

@voice_bp.post("/api/voice/process")
@need(None)
def api_voice_process():
    audio_file = request.files.get("audio")
    transcript = request.form.get("transcript", "").strip()
    original_lang = request.form.get("original_lang", "auto").strip().lower()

    if not transcript and not audio_file:
        raise Bad("Either audio file or voice transcript is required", 400)

    stored_fn = None
    doc_id = None
    if audio_file:
        ext = os.path.splitext(audio_file.filename)[1].lower() or ".wav"
        stored_fn = f"voice_{secrets.token_hex(16)}{ext}"
        fpath = os.path.join(config.UPLOAD_DIR, stored_fn)
        audio_file.save(fpath)

        with tx() as c:
            c.execute("""
                INSERT INTO documents(kind, filename, stored, mime, by, at)
                VALUES('Voice Note', ?, ?, ?, ?, ?)
            """, (audio_file.filename or "voice_recording.wav", stored_fn, audio_file.mimetype or "audio/wav", session.get("username", "system"), now()))
            doc_id = c.lastrowid
            audit("upload", "document", doc_id, f"Voice audio {audio_file.filename}")

    translated_en = ""
    det_lang = original_lang
    if transcript:
        translated_en, det_lang = translate_text(transcript, target="en")

    return jsonify(
        ok=True,
        doc_id=doc_id,
        stored_filename=stored_fn,
        original_transcript=transcript,
        translated_en=translated_en,
        detected_lang=det_lang
    )

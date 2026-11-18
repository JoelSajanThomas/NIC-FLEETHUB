"""Voice recording processing, intelligent multilingual translation, and AI description controller."""
import os, secrets
from flask import Blueprint, jsonify, request, session
from ..config import config
from ..database.connection import tx, audit
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need
from ..services.voice_translation_service import (
    translate_text,
    generate_professional_description,
    transcribe_audio_file,
    detect_language,
    SUPPORTED_LANGUAGES
)
from ..utils.helpers import P, now

voice_bp = Blueprint("voice", __name__)

@voice_bp.post("/api/voice/process")
@voice_bp.post("/voice/process")
@need(None)
def api_voice_process():
    """
    Process recorded speech audio, perform multilingual speech recognition and translation,
    generate AI-powered professional description, and store audio permanently.
    
    Strictly supports:
    1. English (verbatim transcription)
    2. Hindi (natural English translation, no Manglish)
    3. Arabic (natural English translation, no transliteration)
    """
    audio_file = request.files.get("audio") or request.files.get("file")
    transcript = (request.form.get("transcript") or "").strip()
    original_lang = (request.form.get("lang") or request.form.get("original_lang") or "auto").strip().lower()
    module = (request.form.get("module") or "general").strip().lower()
    duration = 0.0
    try:
        duration = float(request.form.get("duration") or 0.0)
    except (ValueError, TypeError):
        duration = 0.0

    record_id = None
    try:
        if request.form.get("record_id"):
            record_id = int(request.form.get("record_id"))
    except (ValueError, TypeError):
        pass

    if not transcript and not audio_file:
        raise Bad("Either audio file or voice transcript is required", 400)

    audio_dir = os.path.join(config.UPLOAD_DIR, "audio")
    os.makedirs(audio_dir, exist_ok=True)

    stored_fn = None
    doc_id = None
    fpath = None

    if audio_file:
        ext = os.path.splitext(audio_file.filename or "")[1].lower() or ".webm"
        stored_fn = f"voice_{secrets.token_hex(16)}{ext}"
        fpath = os.path.join(audio_dir, stored_fn)
        try:
            audio_file.save(fpath)
        except Exception as e:
            print(f"[Voice Controller] Audio save warning: {e}")
            fpath = None

    # If audio is present without transcript, attempt backend speech recognition
    if fpath and not transcript:
        recognized_text, det_code, _ = transcribe_audio_file(fpath, lang=original_lang)
        if recognized_text:
            transcript = recognized_text
            if original_lang == "auto":
                original_lang = det_code

    # If still no transcript, give informative notification
    if not transcript and audio_file:
        transcript = "(Spoken audio recorded)"

    # Translate to English (strictly English, Hindi, Arabic)
    det_lang = original_lang if original_lang in ("en", "hi", "ar") else detect_language(transcript)
    det_name = SUPPORTED_LANGUAGES.get(det_lang, "English")
    
    if transcript and transcript != "(Spoken audio recorded)":
        translated_en, det_lang, det_name = translate_text(transcript, target="en")
    else:
        translated_en = transcript

    # Generate AI-powered professional description
    ai_description = generate_professional_description(
        translated_en if translated_en != "(Spoken audio recorded)" else "",
        lang=det_lang,
        module=module
    )
    if not ai_description and translated_en != "(Spoken audio recorded)":
        ai_description = translated_en

    # Persist audio metadata permanently to documents table
    if stored_fn:
        try:
            with tx() as c:
                complaint_id = record_id if module == "complaints" else None
                wo_id = record_id if module in ("work_orders", "wo") else None
                asset_id = record_id if module in ("assets", "asset") else None
                
                rel_stored = f"audio/{stored_fn}"
                orig_filename = audio_file.filename if (audio_file and audio_file.filename) else stored_fn
                mime = audio_file.mimetype if (audio_file and audio_file.mimetype) else "audio/webm"
                user_name = session.get("username", session.get("name", "system"))

                c.execute("""
                    INSERT INTO documents(
                        kind, filename, stored, mime, by, at,
                        complaint_id, wo_id, asset_id,
                        duration, original_lang, original_transcript, english_translation, ai_description
                    )
                    VALUES('Voice Note', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    orig_filename, rel_stored, mime, user_name, now(),
                    complaint_id, wo_id, asset_id,
                    duration, det_lang, transcript, translated_en, ai_description
                ))
                doc_id = c.lastrowid
                audit("upload", "document", doc_id, f"Voice audio {orig_filename}")
        except Exception as e:
            print(f"[Voice Controller] Database document insert warning: {e}")

    return jsonify(
        ok=True,
        doc_id=doc_id,
        audio_id=doc_id,
        stored_filename=stored_fn,
        audio_url=f"/api/files/{doc_id}" if doc_id else None,
        original_transcript=transcript,
        english_translation=translated_en,
        translated_en=translated_en,
        ai_description=ai_description,
        detected_lang=det_lang,
        detected_lang_name=det_name,
        duration=duration,
        is_translated=(det_lang != "en")
    )

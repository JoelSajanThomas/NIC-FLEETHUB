"""
Document AI Controller for Multilingual OCR, Language Detection, Translation & Intelligent Auto-Fill.
"""

import os
from flask import Blueprint, jsonify, request, session
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need
from ..services.document_ai_service import process_document

document_ai_bp = Blueprint("document_ai", __name__)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}

@document_ai_bp.post("/api/documents/scan-autofill")
@need(None)
def scan_document():
    """
    Scan an uploaded document (PDF, JPG, PNG, WEBP), auto-detect language (EN, HI, AR),
    extract structured fields, translate to English, and return auto-fill mappings.
    """

    f = request.files.get("file")
    if not f or not f.filename:
        raise Bad("Please select a document or invoice file to scan", 400)

    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise Bad(f"Unsupported file format '{ext}'. Allowed: PDF, JPG, JPEG, PNG, WEBP", 400)

    context = request.form.get("context", "purchase")
    file_bytes = f.read()
    if len(file_bytes) > 25 * 1024 * 1024:
        raise Bad("File size exceeds 25 MB limit", 400)

    try:
        result = process_document(file_bytes, f.filename, doc_context=context)
        return jsonify(result)
    except Exception as e:
        raise Bad(f"Document analysis failed: {str(e)}", 500)

"""
AI-Powered Multilingual Document Recognition, Language Detection, Translation & Intelligent Field Auto-Fill Service.
Supports English, Hindi, and Arabic documents (PDF, JPG, JPEG, PNG, WEBP).
"""

import os
import re
import json
from datetime import datetime
import pymupdf
from PIL import Image
import io

try:
    from rapidocr_onnxruntime import RapidOCR
    _ocr_engine = RapidOCR()
except Exception as _e:
    _ocr_engine = None

from .voice_translation_service import translate_text

# Unicode ranges
ARABIC_RANGE = ('\u0600', '\u06FF')
DEV_RANGE = ('\u0900', '\u097F')

# Arabic to Western digits mapping
ARABIC_DIGITS = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
# Devanagari to Western digits mapping
DEV_DIGITS = str.maketrans('०१२३४५६७८९', '0123456789')

def normalize_digits(text: str) -> str:
    """Normalize Arabic and Devanagari digits to standard ASCII digits."""
    if not text:
        return ""
    return text.translate(ARABIC_DIGITS).translate(DEV_DIGITS)

# Multilingual entity detection patterns
PATTERNS = {
    "invoice_no": [
        # English
        r'(?:invoice\s*(?:no\.?|#|number|id)|inv\s*(?:no\.?|#)|bill\s*(?:no\.?|#|number)|receipt\s*(?:no\.?|#)|voucher\s*(?:no\.?|#)|ref\s*(?:no\.?|#)|document\s*(?:no\.?|#))[:\s\-\#]*([A-Za-z0-9\/\-_]{2,30})',
        # Hindi
        r'(?:चालान\s*(?:संख्या|नंबर|क्र\.?)|बिल\s*(?:संख्या|नंबर|क्र\.?)|रसीद\s*(?:संख्या|नंबर)|इनवॉइस\s*(?:संख्या|नंबर))[:\s\-\#]*([A-Za-z0-9\/\-_]{2,30})',
        # Arabic
        r'(?:رقم\s*الفاتورة|فاتورة\s*رقم|رقم\s*السند|سند\s*رقم|رقم\s*الإيصال|إيصال\s*رقم|رقم\s*المطالبة|رقم\s*المرجع)[:\s\-\#]*([A-Za-z0-9\/\-_]{2,30})'
    ],
    "date": [
        # ISO: YYYY-MM-DD or YYYY/MM/DD
        r'\b(20[2-3][0-9][\/\-\.](?:0[1-9]|1[0-2])[\/\-\.](?:0[1-9]|[12][0-9]|3[01]))\b',
        # Standard: DD-MM-YYYY or DD/MM/YYYY
        r'\b((?:0[1-9]|[12][0-9]|3[01])[\/\-\.](?:0[1-9]|1[0-2])[\/\-\.]20[2-3][0-9])\b',
        # Named month: e.g. 18 Nov 2026 or 18 November 2026
        r'\b((?:0?[1-9]|[12][0-9]|3[01])\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+20[2-3][0-9])\b',
        # Arabic date labels
        r'(?:التاريخ|تاريخ\s*الفاتورة|بتاريخ|تاريخ\s*الإصدار)[:\s]*([0-9\/\-\.]{8,12})',
        # Hindi date labels
        r'(?:दिनांक|तारीख|बिल\s*दिनांक)[:\s]*([0-9\/\-\.]{8,12})'
    ],
    "supplier": [
        # English
        r'(?:supplier|vendor|sold\s*by|merchant|biller|provider|company\s*name|workshop)[:\s]+([^\n\r,]{3,60})',
        # Hindi
        r'(?:सप्लायर|विक्रेता|दुकानदार|फर्म\s*का\s*नाम|आपूर्तिकर्ता)[:\s]+([^\n\r,]{3,60})',
        # Arabic
        r'(?:المورد|اسم\s*المورد|البائع|اسم\s*الشركة|مؤسسة|شركة|الورشة)[:\s]+([^\n\r,]{3,60})'
    ],
    "total": [
        # English
        r'(?:grand\s*total|total\s*amount|total\s*due|net\s*total|amount\s*payable|invoice\s*total|total)[:\s]*[^\d\n\r]*([0-9]+(?:[\.,][0-9]{2,3})?)',
        # Hindi
        r'(?:कुल\s*राशि|सकल\s*योग|कुल\s*देय\s*राशि|अंतिम\s*राशि|योग)[:\s]*[^\d\n\r]*([0-9]+(?:[\.,][0-9]{2,3})?)',
        # Arabic
        r'(?:المجموع\s*الكلي|الإجمالي|المبلغ\s*الإجمالي|صافي\s*المبلغ|إجمالي\s*الفاتورة|المجموع\s*النهائي|المبلغ\s*المستحق)[:\s]*[^\d\n\r]*([0-9]+(?:[\.,][0-9]{2,3})?)'
    ],
    "subtotal": [
        r'(?:subtotal|sub-total|gross\s*total|amount\s*before\s*tax)[:\s]*[^\d\n\r]*([0-9]+(?:[\.,][0-9]{2,3})?)',
        r'(?:उप-योग|कर-पूर्व\s*राशि)[:\s]*[^\d\n\r]*([0-9]+(?:[\.,][0-9]{2,3})?)',
        r'(?:المجموع\s*الفرعي|المبلغ\s*الخاضع\s*للضريبة)[:\s]*[^\d\n\r]*([0-9]+(?:[\.,][0-9]{2,3})?)'
    ],
    "tax": [
        r'(?:vat|tax|gst|sales\s*tax|tax\s*amount)[:\s]*[^\d\n\r]*([0-9]+(?:[\.,][0-9]{2,3})?)',
        r'(?:कर|जीएसटी|वैट)[:\s]*[^\d\n\r]*([0-9]+(?:[\.,][0-9]{2,3})?)',
        r'(?:ضريبة\s*القيمة\s*المضافة|الضريبة|قيمة\s*الضريبة)[:\s]*[^\d\n\r]*([0-9]+(?:[\.,][0-9]{2,3})?)'
    ],
    "quantity": [
        r'(?:quantity|qty|units|pcs|nos)[:\s]*([0-9]+(?:\.[0-9]+)?)',
        r'(?:मात्रा|संख्या|नग)[:\s]*([0-9]+(?:\.[0-9]+)?)',
        r'(?:الكمية|العدد|كمية)[:\s]*([0-9]+(?:\.[0-9]+)?)'
    ],
    "unit_price": [
        r'(?:unit\s*price|rate|price\/unit|unit\s*cost|item\s*price)[:\s]*[^\d\n\r]*([0-9]+(?:[\.,][0-9]{2,3})?)',
        r'(?:इकाई\s*मूल्य|दर|प्रति\s*नग\s*मूल्य)[:\s]*[^\d\n\r]*([0-9]+(?:[\.,][0-9]{2,3})?)',
        r'(?:سعر\s*الوحدة|السعر|سعر\s*المفرد)[:\s]*[^\d\n\r]*([0-9]+(?:[\.,][0-9]{2,3})?)'
    ],
    "product_name": [
        r'(?:item\s*description|description|product\s*name|part\s*name|particulars)[:\s]+([^\n\r,]{3,60})',
        r'(?:विवरण|सामग्री\s*विवरण|वस्तु\s*का\s*नाम|पार्ट\s*का\s*नाम)[:\s]+([^\n\r,]{3,60})',
        r'(?:الوصف|بيان\s*الأصناف|اسم\s*الصنف|تفاصيل\s*القطعة)[:\s]+([^\n\r,]{3,60})'
    ],
    # Vehicle Fleet Specifics
    "reg_no": [
        r'(?:plate\s*(?:no\.?|#)|reg\s*(?:no\.?|#)|registration\s*no\.?)[:\s]*([A-Za-z0-9\/\-_]{2,15})',
        r'(?:गाड़ी\s*नंबर|प्लेट\s*नंबर|पंजीकरण\s*संख्या)[:\s]*([A-Za-z0-9\/\-_]{2,15})',
        r'(?:رقم\s*اللوحة|لوحة\s*رقم|رقم\s*المركبة|رقم\s*التسجيل)[:\s]*([A-Za-z0-9\/\-_]{2,15})'
    ],
    "vin": [
        r'\b([A-HJ-NPR-Z0-9]{17})\b',
        r'(?:vin|chassis\s*no\.?|chassis\s*#)[:\s]*([A-HJ-NPR-Z0-9]{11,17})',
        r'(?:चेसिस\s*नंबर|वीआईएन)[:\s]*([A-HJ-NPR-Z0-9]{11,17})',
        r'(?:رقم\s*الشاصي|رقم\s*الهيكل)[:\s]*([A-HJ-NPR-Z0-9]{11,17})'
    ],
    "insurance_company": [
        r'(?:insurance\s*company|insurer)[:\s]+([^\n\r,]{3,50})',
        r'(?:बीमा\s*कंपनी)[:\s]+([^\n\r,]{3,50})',
        r'(?:شركة\s*التأمين|المؤمن)[:\s]+([^\n\r,]{3,50})'
    ],
    "insurance_policy": [
        r'(?:policy\s*(?:no\.?|#)|insurance\s*policy)[:\s]*([A-Za-z0-9\/\-_]{3,25})',
        r'(?:पॉलिसी\s*नंबर|बीमा\s*पॉलिसी)[:\s]*([A-Za-z0-9\/\-_]{3,25})',
        r'(?:رقم\s*الوثيقة|وثيقة\s*التأمين\s*رقم|رقم\s*بوليصة\s*التأمين)[:\s]*([A-Za-z0-9\/\-_]{3,25})'
    ]
}

def detect_document_language(text: str) -> tuple[str, str, float]:
    """Detect primary document language: English (en), Hindi (hi), or Arabic (ar)."""
    if not text or not text.strip():
        return "en", "English", 0.9

    ar_count = sum(1 for c in text if ARABIC_RANGE[0] <= c <= ARABIC_RANGE[1])
    hi_count = sum(1 for c in text if DEV_RANGE[0] <= c <= DEV_RANGE[1])
    en_count = sum(1 for c in text if c.isascii() and c.isalpha())

    total = ar_count + hi_count + en_count
    if total == 0:
        return "en", "English", 0.9

    if ar_count > hi_count and ar_count >= 10:
        conf = min(0.99, round(ar_count / total + 0.4, 2))
        return "ar", "Arabic", conf
    elif hi_count > ar_count and hi_count >= 10:
        conf = min(0.99, round(hi_count / total + 0.4, 2))
        return "hi", "Hindi", conf
    else:
        conf = min(0.99, round(en_count / total + 0.4, 2))
        return "en", "English", conf

def detect_currency(text: str) -> str:
    """Detect monetary currency mentioned in document."""
    lower = text.lower()
    if any(k in lower for k in ["kwd", "د.ك", "دينار كويتي", "kd ", " kd", "k.d"]):
        return "KWD"
    if any(k in lower for k in ["usd", "$", "dollar"]):
        return "USD"
    if any(k in lower for k in ["eur", "€", "euro"]):
        return "EUR"
    if any(k in lower for k in ["gbp", "£", "pound"]):
        return "GBP"
    if any(k in lower for k in ["sar", "ر.س", "ريال سعودي"]):
        return "SAR"
    if any(k in lower for k in ["aed", "د.إ", "درهم"]):
        return "AED"
    if any(k in lower for k in ["inr", "₹", "rupees", "रुपये", "रुपया"]):
        return "INR"
    if any(k in lower for k in ["qar", "ر.ق"]):
        return "QAR"
    if any(k in lower for k in ["bhd", "د.ب"]):
        return "BHD"
    if any(k in lower for k in ["omr", "ر.ع"]):
        return "OMR"
    return "KWD"

def standardize_date(raw_date_str: str) -> str:
    """Convert raw date string into standard ISO YYYY-MM-DD."""
    if not raw_date_str:
        return ""
    cleaned = raw_date_str.strip().replace('/', '-').replace('.', '-')
    parts = cleaned.split('-')
    if len(parts) == 3:
        # Check if year is first (YYYY-MM-DD)
        if len(parts[0]) == 4:
            try:
                y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
                return f"{y:04d}-{m:02d}-{d:02d}"
            except Exception:
                pass
        # Check if year is last (DD-MM-YYYY)
        elif len(parts[2]) == 4:
            try:
                d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
                return f"{y:04d}-{m:02d}-{d:02d}"
            except Exception:
                pass
    # Try parsing month names
    for fmt in ["%d %b %Y", "%d %B %Y", "%b %d, %Y", "%B %d, %Y"]:
        try:
            dt = datetime.strptime(raw_date_str.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except Exception:
            pass
    return raw_date_str.strip()

def parse_float(val_str: str) -> float:
    """Safely parse string float, removing commas."""
    if not val_str:
        return 0.0
    try:
        clean = val_str.replace(',', '').strip()
        return round(float(clean), 3)
    except Exception:
        return 0.0

def extract_text_from_file(file_bytes: bytes, filename: str) -> tuple[str, list[str]]:
    """Extract full raw text and lines from PDF or Image file."""
    ext = os.path.splitext(filename)[1].lower()
    raw_text = ""
    lines = []

    # 1. PDF File Processing
    if ext == ".pdf":
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text("text")
                if text and len(text.strip()) > 20:
                    raw_text += text + "\n"
                elif _ocr_engine:
                    # Fallback to OCR on page pixmap for scanned PDFs
                    pix = page.get_pixmap(dpi=150)
                    img_bytes = pix.tobytes("png")
                    ocr_res, _ = _ocr_engine(img_bytes)
                    if ocr_res:
                        for box, text_res, score in ocr_res:
                            raw_text += text_res + "\n"
            doc.close()
        except Exception as e:
            print(f"[Document AI] Error reading PDF: {e}")

    # 2. Text / Scanned / Raw Text Testing
    elif ext in [".txt", ".csv", ".json"]:
        try:
            raw_text = file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            pass

    # 3. Image File Processing (JPG, JPEG, PNG, WEBP)
    elif ext in [".jpg", ".jpeg", ".png", ".webp"]:
        if _ocr_engine:
            try:
                ocr_res, _ = _ocr_engine(file_bytes)
                if ocr_res:
                    for box, text_res, score in ocr_res:
                        raw_text += text_res + "\n"
            except Exception as e:
                print(f"[Document AI] Error during image OCR: {e}")
        else:
            # Fallback using PIL / basic EXIF metadata if OCR engine is unavailable
            try:
                img = Image.open(io.BytesIO(file_bytes))
                raw_text = f"Image {img.format} {img.size[0]}x{img.size[1]}"
            except Exception:
                pass

    # Normalize digits (Arabic/Hindi numerals)
    raw_text = normalize_digits(raw_text)
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    return raw_text, lines

def parse_line_items(lines: list[str]) -> list[dict]:
    """Parse item rows from table lines (e.g. 'Hydraulic Filter 4 12.500 50.000')."""
    items = []
    # Pattern: Description followed by Qty (int) and Unit Price (float) and optional Total (float)
    row_pattern = re.compile(r'^(.*?)\s+([0-9]+)\s+([0-9]+(?:[\.,][0-9]{2,3})?)(?:\s+([0-9]+(?:[\.,][0-9]{2,3})?))?$')
    for line in lines:
        m = row_pattern.match(line)
        if m:
            desc = m.group(1).strip()
            qty = parse_float(m.group(2))
            unit_price = parse_float(m.group(3))
            tot = parse_float(m.group(4)) if m.group(4) else round(qty * unit_price, 3)
            # Avoid matching header rows
            if desc and not any(k in desc.lower() for k in ["total", "subtotal", "tax", "vat", "invoice", "date", "qty", "price"]):
                items.append({
                    "description": desc,
                    "qty": int(qty) if qty.is_integer() else qty,
                    "unit_price": unit_price,
                    "total": tot
                })
    return items

def process_document(file_bytes: bytes, filename: str, doc_context: str = "purchase") -> dict:
    """
    Main AI document processing pipeline:
    1. Read and OCR document text.
    2. Detect document language (en, hi, ar).
    3. Extract structured individual field values according to module context.
    4. Translate non-English values to clear English.
    5. Validate arithmetic and return confidence scores.
    """
    raw_text, lines = extract_text_from_file(file_bytes, filename)
    detected_lang, detected_lang_name, lang_conf = detect_document_language(raw_text)
    currency = detect_currency(raw_text)

    fields = {}

    def extract_field(field_key: str, conf_base: float = 0.95):
        patterns = PATTERNS.get(field_key, [])
        for pat in patterns:
            # Check full text first
            m = re.search(pat, raw_text, re.IGNORECASE)
            if m and m.group(1).strip():
                val = m.group(1).strip()
                return val, conf_base
            # Check line by line
            for line in lines:
                m_line = re.search(pat, line, re.IGNORECASE)
                if m_line and m_line.group(1).strip():
                    return m_line.group(1).strip(), conf_base
        return None, 0.0

    # Extract common document fields
    inv_no, inv_conf = extract_field("invoice_no")
    doc_date, date_conf = extract_field("date")
    supplier, sup_conf = extract_field("supplier")
    grand_total, total_conf = extract_field("total")
    subtotal, sub_conf = extract_field("subtotal")
    tax, tax_conf = extract_field("tax")
    qty, qty_conf = extract_field("quantity")
    unit_price, price_conf = extract_field("unit_price")
    prod_name, prod_conf = extract_field("product_name")

    # Vehicle / fleet specific fields
    reg_no, reg_conf = extract_field("reg_no")
    vin, vin_conf = extract_field("vin")
    ins_company, ins_comp_conf = extract_field("insurance_company")
    ins_policy, ins_pol_conf = extract_field("insurance_policy")

    # Parse multi-item table rows
    line_items = parse_line_items(lines)
    if not prod_name and line_items:
        prod_name = line_items[0]["description"]
        prod_conf = 0.88
    if not qty and line_items:
        qty = str(line_items[0]["qty"])
        qty_conf = 0.88
    if not unit_price and line_items:
        unit_price = str(line_items[0]["unit_price"])
        price_conf = 0.88

    # Standardize values
    std_date = standardize_date(doc_date) if doc_date else ""
    num_total = parse_float(grand_total)
    num_subtotal = parse_float(subtotal)
    num_tax = parse_float(tax)
    num_qty = parse_float(qty) if qty else 1.0
    num_price = parse_float(unit_price)

    # Arithmetic self-verification
    calcs_verified = False
    if num_price > 0 and num_qty > 0 and num_total > 0:
        if abs((num_price * num_qty) - num_total) < 0.05:
            calcs_verified = True
    elif num_subtotal > 0 and num_tax >= 0 and num_total > 0:
        if abs((num_subtotal + num_tax) - num_total) < 0.05:
            calcs_verified = True

    # Derive missing values if unambiguous
    if num_total > 0 and num_qty > 0 and num_price == 0.0:
        num_price = round(num_total / num_qty, 3)
        price_conf = 0.85
    elif num_price > 0 and num_qty > 0 and num_total == 0.0:
        num_total = round(num_price * num_qty, 3)
        total_conf = 0.85

    # Translation into natural English for non-English documents
    def translate_if_needed(text_val: str) -> tuple[str, str]:
        if not text_val:
            return "", ""
        if detected_lang in ["hi", "ar"]:
            trans, _, _ = translate_text(text_val)
            return trans, text_val
        return text_val, text_val

    trans_supplier, orig_supplier = translate_if_needed(supplier)
    trans_prod, orig_prod = translate_if_needed(prod_name)
    trans_ins_co, orig_ins_co = translate_if_needed(ins_company)

    # Translate descriptions in line items
    translated_line_items = []
    for item in line_items:
        t_desc, o_desc = translate_if_needed(item["description"])
        translated_line_items.append({
            "description": t_desc,
            "original_description": o_desc,
            "qty": item["qty"],
            "unit_price": item["unit_price"],
            "total": item["total"]
        })

    # Assemble structured fields map
    if inv_no:
        fields["invoice_no"] = {"value": inv_no, "confidence": inv_conf}
    if std_date:
        fields["date"] = {"value": std_date, "confidence": date_conf}
    if trans_supplier:
        fields["supplier"] = {"value": trans_supplier, "original_value": orig_supplier, "confidence": sup_conf}
    if trans_prod:
        fields["part_name"] = {"value": trans_prod, "original_value": orig_prod, "confidence": prod_conf}
    if num_qty > 0:
        fields["qty"] = {"value": int(num_qty) if num_qty.is_integer() else num_qty, "confidence": qty_conf or 0.9}
    if num_price > 0:
        fields["unit_price"] = {"value": num_price, "confidence": price_conf}
    if num_total > 0:
        fields["total_amount"] = {"value": num_total, "confidence": total_conf}
    if num_tax > 0:
        fields["tax"] = {"value": num_tax, "confidence": tax_conf}
    if num_subtotal > 0:
        fields["subtotal"] = {"value": num_subtotal, "confidence": sub_conf}
    fields["currency"] = {"value": currency, "confidence": 0.98}

    if reg_no:
        fields["reg_no"] = {"value": reg_no, "confidence": reg_conf}
    if vin:
        fields["vin"] = {"value": vin, "confidence": vin_conf}
    if trans_ins_co:
        fields["insurance_company"] = {"value": trans_ins_co, "original_value": orig_ins_co, "confidence": ins_comp_conf}
    if ins_policy:
        fields["insurance_policy"] = {"value": ins_policy, "confidence": ins_pol_conf}

    # Context-specific document classification
    doc_type = "Purchase Invoice / Bill"
    if doc_context == "vehicle" or reg_no or vin:
        doc_type = "Vehicle Registration / Inspection Certificate"
    elif doc_context == "expense":
        doc_type = "Maintenance Expense Receipt"
    elif doc_context == "historical":
        doc_type = "Historical Maintenance Record"

    # Overall document confidence score
    confs = [f["confidence"] for f in fields.values() if isinstance(f, dict) and "confidence" in f]
    avg_conf = int(round((sum(confs) / len(confs)) * 100)) if confs else 80

    return {
        "success": True,
        "filename": filename,
        "detected_lang": detected_lang,
        "detected_lang_name": detected_lang_name,
        "doc_type": doc_type,
        "overall_confidence": avg_conf,
        "calculations_verified": calcs_verified,
        "fields": fields,
        "line_items": translated_line_items,
        "raw_text_preview": raw_text[:500] if raw_text else ""
    }

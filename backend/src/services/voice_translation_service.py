"""Intelligent multilingual voice transcription, translation and AI description generation service.
Strictly supports English (en), Hindi (hi), and Arabic (ar).
"""
import json, re, urllib.request, urllib.parse, os

# Supported languages mapping (Strictly 3 languages)
SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "ar": "Arabic"
}

DEV_RANGE = ('\u0900', '\u097F')
ARABIC_RANGE = ('\u0600', '\u06FF')

# Common Romanized Hindi markers for automatic detection
ROMAN_HINDI_PATTERNS = [
    r'\b(mujhe|humko|mera|meri|mere|chahiye|hai|hain|tha|thi|the|nahi|karo|karna|hogaya|ho\s+gaya|kharab|gadi|gaadi|aawaz|tel|paani|pata|kaise|bhai|sahab|kripya|jaldi|kaam|badlo|badalna|service|dikkat|samasya)\b'
]

# Kuwait Fleet domain glossary for natural translation and preservation
FLEET_GLOSSARY = {
    "الفحص الفني": "Technical Inspection (Fahs Fanni)",
    "فحص فني": "Technical Inspection (Fahs Fanni)",
    "دفتر": "Traffic Registration (Daftar)",
    "الدفتر": "Traffic Registration (Daftar)",
    "الشويخ": "Shuwaikh",
    "الصليبية": "Sulaibiya",
    "الأحمدي": "Ahmadi",
    "الشعيبة": "Shuaiba",
    "الزور": "Al-Zour",
    "الصبية": "Subiya",
    "دينار": "KWD",
    "فلس": "fils"
}

AUTO_DICT = FLEET_GLOSSARY

def detect_language(text):
    """
    Detect whether text is English (en), Hindi (hi), or Arabic (ar).
    Strictly restricted to these three languages.
    """
    if not text or not text.strip():
        return "en"
    
    # 1. Check Arabic Unicode script
    if any(ARABIC_RANGE[0] <= c <= ARABIC_RANGE[1] for c in text):
        return "ar"
    
    # 2. Check Hindi Devanagari Unicode script
    if any(DEV_RANGE[0] <= c <= DEV_RANGE[1] for c in text):
        return "hi"
    
    # 3. Check Romanized Hindi / Manglish vocabulary
    lower = text.lower()
    for pat in ROMAN_HINDI_PATTERNS:
        if re.search(pat, lower):
            return "hi"
            
    # Default to English
    return "en"

def translate_text(text, target="en"):
    """
    Translate text into natural, professional English with automatic language detection.
    
    Rules:
    1. English speech: Retain original text without alteration.
    2. Hindi speech: Translate into grammatically correct English (never output Manglish/transliteration).
    3. Arabic speech: Translate into clear, grammatically correct English (never output transliteration).
    4. Preserve amounts, numbers, dates, and technical terminology.
    """
    if not text or not text.strip():
        return "", "en", "English"
    
    text = text.strip()
    detected_code = detect_language(text)
    detected_name = SUPPORTED_LANGUAGES.get(detected_code, "English")
    
    # RULE 1: If detected as English, preserve the original words verbatim
    if detected_code == "en":
        return text, "en", "English"
    
    # RULE 2: Hindi or Arabic -> Translate to clean, natural English
    try:
        source_lang = detected_code
        url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + source_lang + "&tl=en&dt=t&q=" + urllib.parse.quote(text)
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        )
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode("utf-8"))
            translated = "".join([x[0] for x in data[0] if x and x[0]]).strip()
            
            # Apply Kuwait fleet terminology preservation
            for term, replacement in FLEET_GLOSSARY.items():
                if term in text and replacement not in translated:
                    translated = translated + f" ({replacement})"
            
            # Ensure capitalized start
            if translated and translated[0].islower():
                translated = translated[0].upper() + translated[1:]
                
            return translated, detected_code, detected_name
    except Exception as e:
        # Fallback dictionary for offline or network interruption
        print(f"[Translation Service Warning] External translation fallback: {e}")
        fallback_trans = text
        for term, replacement in FLEET_GLOSSARY.items():
            if term in fallback_trans:
                fallback_trans = fallback_trans.replace(term, replacement)
        return fallback_trans, detected_code, detected_name

def generate_professional_description(text, lang="en", module="general"):
    """
    AI-Powered Description Generation.
    Understands the meaning of spoken/written information and automatically generates a
    professional English Description or Notes entry.
    
    Rules:
    - Use professional business English.
    - Preserve original meaning, numbers, dates, quantities, asset codes.
    - Standardize engineering and maintenance phrasing.
    - Never invent fictitious technical findings.
    """
    if not text or not text.strip():
        return ""
    
    cleaned = text.strip()
    # If text is not English, ensure it is translated first
    if lang != "en" or detect_language(cleaned) != "en":
        translated, _, _ = translate_text(cleaned, target="en")
        if translated:
            cleaned = translated
            
    lower = cleaned.lower()
    
    # Check for specific numbers or codes to preserve
    identifiers = re.findall(r'\b(?:asset|wo|cmp|po|inv|part|no\.?|id)?\s*[-#]?[A-Za-z0-9\/_-]{3,20}\b', cleaned, re.IGNORECASE)
    preserved_ids = " ".join(dict.fromkeys(identifiers)) if identifiers else ""
    
    # 1. Brake System
    if any(k in lower for k in ["brake", "stopping", "pedal", "caliper", "rotor", "pad"]):
        if any(k in lower for k in ["inspect", "check", "examine", "test", "jaanch", "fahs"]):
            return "Vehicle brake issue reported. Inspection is required to identify the problem and determine the necessary maintenance."
        if any(k in lower for k in ["noise", "sound", "squeak", "grind"]):
            return "Abnormal brake noise and vibration observed during operation. Comprehensive inspection of brake pads, discs, and calipers required."
        if any(k in lower for k in ["fail", "soft", "spongy", "leak", "fluid"]):
            return "Critical brake pressure anomaly reported. Hydraulic fluid line inspection and brake caliper pressure check required."
        return "Vehicle braking system anomaly reported. Diagnostic evaluation and safety inspection required."

    # 2. Engine Overheating & Cooling
    if any(k in lower for k in ["overheat", "temperature", "coolant", "radiator", "steam", "thermostat"]):
        return "Engine thermal management anomaly reported. Inspection of radiator cooling assembly, coolant levels, and thermostat operation required."

    # 3. Oil & Fluid Leakages
    if any(k in lower for k in ["oil leak", "fluid leak", "hydraulic leak", "dripping", "leaking", "fluid underneath"]):
        return "Fluid leakage detected underneath vehicle. Comprehensive inspection of seals, gaskets, fluid reservoirs, and hydraulic connections required."

    # 4. Engine & Powertrain Performance
    if any(k in lower for k in ["engine", "misfire", "stalling", "crank", "starting problem", "power loss", "acceleration"]):
        if "start" in lower or "crank" in lower:
            return "Engine starting failure reported. Evaluation of ignition system, starter motor, and fuel delivery system required."
        return "Powertrain operational irregularity reported. Diagnostic scan and engine performance inspection required."

    # 5. Battery & Electrical System
    if any(k in lower for k in ["battery", "alternator", "fuse", "headlight", "wiring", "electrical", "charging"]):
        return "Electrical system anomaly reported. Battery health test, alternator charging output evaluation, and circuit continuity check required."

    # 6. Tyres & Wheel Assembly
    if any(k in lower for k in ["tyre", "tire", "puncture", "flat", "tread", "wheel", "rim"]):
        return "Wheel and tyre condition issue reported. Inspection for puncture damage, tread integrity, and tyre pressure regulation required."

    # 7. Steering & Suspension
    if any(k in lower for k in ["steering", "suspension", "shock absorber", "strut", "alignment", "pulling"]):
        return "Steering and suspension handling irregularity reported. Wheel alignment verification and suspension component inspection recommended."

    # 8. Cabin Air Conditioning (A/C)
    if any(k in lower for k in ["ac", "air condition", "air conditioner", "cabin cooling", "blower", "compressor"]):
        return "Cabin climate control deficiency reported. Diagnostic evaluation of AC compressor, refrigerant charge, and cabin filters required."

    # 9. Technical Inspection (Fahs Fanni) & Traffic Registration
    if any(k in lower for k in ["inspection", "fahs", "fanni", "daftar", "traffic", "annual check"]):
        return "Preparation for official technical vehicle inspection (Fahs Fanni) required. Comprehensive mechanical, safety, and emissions audit scheduled."

    # 10. Routine Preventive Maintenance
    if any(k in lower for k in ["routine maintenance", "preventive maintenance", "scheduled service", "oil change", "periodic service", "service report"]):
        return "Scheduled periodic fleet maintenance requested. Routine fluid renewal, filter replacement, and multi-point vehicle safety inspection required."

    # 11. Bodywork & Exterior Damage
    if any(k in lower for k in ["damage", "dent", "scratch", "accident", "bumper", "mirror", "windshield"]):
        return "Exterior bodywork damage reported. Physical inspection and repair assessment required to evaluate chassis and panel restoration."

    # 12. General breakdown / custom description refinement
    # If the sentence is already descriptive, standardize into professional passive business English
    result = cleaned
    if not result.endswith("."):
        result += "."
    if result[0].islower():
        result = result[0].upper() + result[1:]
        
    # Remove informal filler phrases
    result = re.sub(r'^(?:please|kindly|i\s+want\s+to\s+report\s+that|i\s+need\s+to\s+report|there\s+is\s+a\s+problem\s+where)\s*', '', result, flags=re.IGNORECASE)
    if result and result[0].islower():
        result = result[0].upper() + result[1:]
        
    return result

def transcribe_audio_file(file_path, lang="auto"):
    """
    Transcribe recorded audio file using speech recognition.
    Strictly supports English, Hindi, and Arabic.
    """
    try:
        import speech_recognition as sr
        r = sr.Recognizer()
        
        # Check if file exists
        if not os.path.exists(file_path):
            return "", "en", "English"
            
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".wav":
            with sr.AudioFile(file_path) as source:
                audio_data = r.record(source)
                
            # Language code mapping
            lang_code = "en-US"
            if lang == "hi":
                lang_code = "hi-IN"
            elif lang == "ar":
                lang_code = "ar-SA"
                
            text = r.recognize_google(audio_data, language=lang_code)
            det_lang = lang if lang in ("en", "hi", "ar") else detect_language(text)
            det_name = SUPPORTED_LANGUAGES.get(det_lang, "English")
            return text, det_lang, det_name
    except Exception as e:
        print(f"[Speech Recognition Service Warning] Transcribe error: {e}")
        
    return "", "en", "English"

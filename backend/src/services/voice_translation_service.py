"""Intelligent multilingual voice transcription and automatic English translation service.
Strictly supports English (en), Hindi (hi), and Arabic (ar).
"""
import json, re, urllib.request, urllib.parse

# Supported languages mapping
SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "ar": "Arabic"
}

DEV_RANGE = ('\u0900', '\u097F')
ARABIC_RANGE = ('\u0600', '\u06FF')

# Common Romanized Hindi markers for automatic detection
ROMAN_HINDI_PATTERNS = [
    r'\b(mujhe|humko|mera|meri|mere|chahiye|hai|hain|tha|thi|the|nahi|karo|karna|hogaya|ho\s+gaya|kharab|gadi|gaadi|aawaz|tel|paani|pata|kaise|bhai|sahab|kripya|jaldi|kaam|badlo|badalna|service)\b'
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

# Backward compatibility alias
AUTO_DICT = FLEET_GLOSSARY

def detect_language(text):
    """Detect whether text is English (en), Hindi (hi), or Arabic (ar)."""
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

"""Voice transcription & translation service supporting English, Hindi, and Arabic."""
import json, urllib.request, urllib.parse

AUTO_DICT = {
    "ब्रेक": "brakes", "इंजन": "engine", "तेल": "oil", "ऑयल": "oil", "लीक": "leak", "रिसाव": "leakage",
    "गरम": "overheating", "ओवरहीटिंग": "overheating", "हाइड्रोलिक": "hydraulic", "टायर": "tyre", "पहिया": "wheel",
    "खराब": "breakdown / faulty", "धुआं": "smoke", "आवाज": "noise / sound", "बैटरी": "battery", "गियर": "transmission",
    "क्लच": "clutch", "रेडिएटर": "radiator", "फिल्टर": "filter", "स्टार्ट": "start", "मशीन": "machine", "गाड़ी": "vehicle",
    "فرامل": "brakes", "مكابح": "brakes", "محرك": "engine", "ماكينة": "engine", "زيت": "oil", "تسريب": "leak",
    "تسرب": "leakage", "حرارة": "overheating", "يسخن": "overheating", "هيدروليك": "hydraulic", "إطار": "tyre",
    "تواير": "tyres", "كفرات": "tyres", "عطلان": "broken / breakdown", "معطل": "out of order", "خراب": "damaged",
    "دخان": "smoke", "صوت غريب": "strange noise", "بطارية": "battery", "فلتر": "filter", "فلاتر": "filters",
    "رديتر": "radiator", "مبرد": "cooler / radiator", "جير": "gearbox / transmission", "كلتش": "clutch", "مضخة": "pump"
}

def translate_text(text, target="en"):
    """Translate text into target language with automatic language detection."""
    if not text or not text.strip():
        return text, "en"
    text = text.strip()
    try:
        url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" + target + "&dt=t&q=" + urllib.parse.quote(text)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
        with urllib.request.urlopen(req, timeout=4) as res:
            data = json.loads(res.read().decode("utf-8"))
            det = data[2] if len(data) > 2 and data[2] else "auto"
            if det.startswith("hi"): det = "hi"
            elif det.startswith("ar"): det = "ar"
            elif det.startswith("en"): det = "en"
            trans = "".join([x[0] for x in data[0] if x and x[0]])
            return trans.strip(), det
    except Exception:
        det = "en"
        if any('\u0600' <= char <= '\u06FF' for char in text):
            det = "ar"
        elif any('\u0900' <= char <= '\u097F' for char in text):
            det = "hi"
        words = text.split()
        translated_words = []
        found_any = False
        for w in words:
            clean_w = w.strip(".,;:?!")
            if clean_w in AUTO_DICT:
                translated_words.append(AUTO_DICT[clean_w])
                found_any = True
            else:
                translated_words.append(w)
        if found_any:
            return " ".join(translated_words), det
        return text, det

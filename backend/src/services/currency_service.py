"""Multi-currency & exchange rate service (Base currency: KWD)."""
import json, urllib.request
from ..database.connection import tx, one, rows
from ..utils.helpers import now

def fetch_live_rates():
    """Fetch live rates against KWD and update database."""
    try:
        req = urllib.request.Request("https://open.er-api.com/v6/latest/KWD", headers={"User-Agent": "NIC-FleetHub/1.0"})
        with urllib.request.urlopen(req, timeout=4) as r:
            data = json.loads(r.read().decode())
            if data.get("result") == "success" and "rates" in data:
                rates = data["rates"]
                with tx() as c:
                    for cur_code, rate_from in rates.items():
                        if cur_code in ("USD", "EUR", "GBP", "AED", "SAR", "QAR", "BHD", "OMR", "INR", "JPY", "CNY", "CHF", "CAD", "AUD"):
                            rate_to = 1.0 / float(rate_from) if float(rate_from) > 0 else 0
                            c.execute("""INSERT INTO exchange_rates(currency, rate_to_kwd, rate_from_kwd, is_manual, updated_at)
                                         VALUES(?,?,?,0,?)
                                         ON CONFLICT(currency) DO UPDATE SET
                                            rate_to_kwd = CASE WHEN is_manual=1 THEN rate_to_kwd ELSE excluded.rate_to_kwd END,
                                            rate_from_kwd = CASE WHEN is_manual=1 THEN rate_from_kwd ELSE excluded.rate_from_kwd END,
                                            updated_at = CASE WHEN is_manual=1 THEN updated_at ELSE excluded.updated_at END""",
                                      (cur_code, round(rate_to, 6), round(float(rate_from), 4), now()))
    except Exception:
        pass

def convert_to_kwd(amount, currency="KWD", manual_rate=None):
    """Convert amount in foreign currency to KWD with 3 decimal precision."""
    amt = float(amount or 0)
    cur = (currency or "KWD").strip().upper()
    if cur == "KWD" or amt == 0:
        return round(amt, 3), 1.0
    if manual_rate and float(manual_rate) > 0:
        rate = float(manual_rate)
        return round(amt * rate, 3), rate
    row = one("SELECT rate_to_kwd FROM exchange_rates WHERE currency=?", (cur,))
    if row and row.get("rate_to_kwd") and float(row["rate_to_kwd"]) > 0:
        rate = float(row["rate_to_kwd"])
        return round(amt * rate, 3), rate
    defaults = {
        "USD": 0.3082, "EUR": 0.3351, "GBP": 0.3952, "AED": 0.0839,
        "SAR": 0.0821, "QAR": 0.0846, "BHD": 0.8175, "OMR": 0.8005,
        "INR": 0.00366, "JPY": 0.00206, "CNY": 0.0429
    }
    rate = defaults.get(cur, 1.0)
    return round(amt * rate, 3), rate

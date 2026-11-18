"""Currency exchange and conversion controller (Base: KWD)."""
from flask import Blueprint, jsonify
from ..database.connection import rows, tx, audit
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need
from ..services.currency_service import fetch_live_rates
from ..services.sync_service import notify_sync
from ..utils.helpers import P, now

currency_bp = Blueprint("currency", __name__)

@currency_bp.get("/api/currency/rates")
@need(None)
def api_currency_rates():
    rates = rows("SELECT currency, rate_to_kwd, rate_from_kwd, is_manual, updated_at FROM exchange_rates ORDER BY currency")
    return jsonify(
        base="KWD", name="Kuwaiti Dinar", symbol="KWD", symbol_ar="د.ك",
        precision=3, unit="fils", provider="Open Exchange Rates API (Live Feed)", rates=rates
    )

@currency_bp.post("/api/currency/rates")
@need("settings")
def api_currency_set_rate():
    p = P()
    cur = (p.get("currency") or "").strip().upper()
    rate = float(p.get("rate_to_kwd") or 0)
    if not cur or cur == "KWD" or rate <= 0:
        raise Bad("Valid currency and positive exchange rate to KWD are required")
    r_from = round(1.0 / rate, 4)
    with tx() as c:
        c.execute("""INSERT INTO exchange_rates(currency, rate_to_kwd, rate_from_kwd, is_manual, updated_at)
                     VALUES(?,?,?,1,?)
                     ON CONFLICT(currency) DO UPDATE SET rate_to_kwd=excluded.rate_to_kwd, rate_from_kwd=excluded.rate_from_kwd, is_manual=1, updated_at=excluded.updated_at""",
                  (cur, round(rate, 6), r_from, now()))
        audit("update", "currency_rate", cur, f"Manual rate {rate} KWD")
    notify_sync("currency_rate", {"currency": cur})
    return jsonify(ok=1, currency=cur, rate_to_kwd=rate, rate_from_kwd=r_from)

@currency_bp.post("/api/currency/sync")
@need("settings")
def api_currency_sync():
    fetch_live_rates()
    notify_sync("currency_sync")
    return jsonify(ok=1, rates=rows("SELECT currency, rate_to_kwd, rate_from_kwd, is_manual, updated_at FROM exchange_rates ORDER BY currency"))

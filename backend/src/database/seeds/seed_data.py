"""Initial seeds for Kuwait operational defaults and admin account."""
import os
from werkzeug.security import generate_password_hash
from ..connection import connect
from ...utils.helpers import now

def seed_defaults():
    """Seed initial Kuwait worksites, categories, exchange rates, and admin user."""
    con = connect()
    cur = con.cursor()

    # 1. Default Role Demo Users (One per role)
    demo_users = [
        ("admin", "Administrator", "admin", os.environ.get("FLEETHUB_ADMIN_PASSWORD", "admin12345"), "en"),
        ("superadmin", "Super Administrator", "super_admin", "superadmin12345", "en"),
        ("companyadmin", "Executive Director", "company_admin", "company12345", "en"),
        ("transport", "Transport Controller", "transport", "transport12345", "en"),
        ("mechanical", "Senior Mechanical Engineer", "mechanical", "mechanical12345", "en"),
        ("workshop", "Central Workshop Supervisor", "workshop", "workshop12345", "en"),
        ("mechanic", "Senior Plant Mechanic", "mechanic", "mechanic12345", "en"),
        ("inventory", "Warehouse & Inventory Head", "inventory", "inventory12345", "en"),
        ("procurement", "Purchasing & Sourcing Officer", "procurement", "procurement12345", "en"),
        ("driver", "Rashed Al-Mutairi", "driver", "driver12345", "ar"),
        ("management", "Operations Director", "management", "management12345", "en")
    ]
    for u_name, name, role, pw, lang in demo_users:
        cur.execute("SELECT id FROM users WHERE username = ?", (u_name,))
        if not cur.fetchone():
            hashed = generate_password_hash(pw)
            cur.execute(
                "INSERT INTO users(username, name, role, pw, active, preferred_lang) VALUES(?,?,?,?,1,?)",
                (u_name, name, role, hashed, lang)
            )

    # 2. Kuwait Worksites
    sites = [
        ("Ahmadi Operations Base", "Workshop & Yard", "Ahmadi", "29103948", "Eng. Fahad Al-Mutawa", "+965 2398 4400"),
        ("Shuaiba Industrial Facility", "Industrial Plant", "Ahmadi", "28301192", "Eng. Khaled Al-Enezi", "+965 2326 1122"),
        ("Sulaibiya Production Complex", "Production Complex", "Jahra", "30918234", "Tariq Mansour", "+965 2467 8900"),
        ("Sabah Al-Ahmad Residential Project", "Project Site", "Ahmadi", "41029384", "Eng. Salem Al-Hajji", "+965 9912 3456"),
        ("Al-Zour Coastal Refinery Site", "Project Site", "Ahmadi", "49201928", "Nasser Al-Otaibi", "+965 9723 4567"),
        ("Subiya Power Plant Yard", "Project Site", "Jahra", "50192834", "Eng. Jassem Al-Bahar", "+965 9401 2345"),
        ("Kuwait Yard", "Central Yard", "Capital", "20193847", "Fleet Dispatcher", "+965 2224 5500")
    ]
    for s in sites:
        cur.execute("SELECT id FROM worksites WHERE name = ?", (s[0],))
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO worksites(name, site_type, governorate, paci_no, contact_person, contact_phone, active) VALUES(?,?,?,?,?,?,1)",
                s
            )

    # 3. Categories
    categories = [
        ("asset", "Dump Truck"), ("asset", "Excavator"), ("asset", "Mobile Crane"),
        ("asset", "Transit Mixer"), ("asset", "Wheel Loader"), ("asset", "Bulldozer"),
        ("part", "Hydraulics"), ("part", "Engine Components"), ("part", "Filters & Fluids"),
        ("part", "Braking System"), ("part", "Electrical & Sensors"), ("part", "Under-carriage & Tracks")
    ]
    for kind, name in categories:
        cur.execute("SELECT id FROM categories WHERE kind = ? AND name = ?", (kind, name))
        if not cur.fetchone():
            cur.execute("INSERT INTO categories(kind, name) VALUES(?,?)", (kind, name))

    # 4. Exchange Rates (Pegged to KWD)
    rates = [
        ("USD", 0.308, "Central Bank of Kuwait"),
        ("EUR", 0.334, "Central Bank of Kuwait"),
        ("GBP", 0.392, "Central Bank of Kuwait"),
        ("SAR", 0.082, "Central Bank of Kuwait"),
        ("AED", 0.084, "Central Bank of Kuwait"),
        ("INR", 0.0037, "Central Bank of Kuwait")
    ]
    for curr, rate, src in rates:
        cur.execute("SELECT id FROM exchange_rates WHERE currency = ?", (curr,))
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO exchange_rates(currency, rate_to_kwd, is_auto, source, last_updated) VALUES(?,?,1,?,?)",
                (curr, rate, src, now())
            )

    con.commit()
    con.close()

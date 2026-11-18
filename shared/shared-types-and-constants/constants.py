"""NIC FleetHub - Shared Constants & Enums (Python)."""

APP_NAME = "NIC FleetHub"
COMPANY_NAME = "National Industries Company (K.S.C.C)"
COUNTRY = "Kuwait"
BASE_CURRENCY = "KWD"
CURRENCY_DECIMALS = 3

SUPPORTED_LANGUAGES = ["en", "hi", "ar"]
DEFAULT_LANGUAGE = "en"
RTL_LANGUAGES = ["ar"]

ASSET_STATUSES = [
    "Active",
    "Under Repair",
    "Out of Service",
    "Decommissioned",
]

ASSET_CATEGORIES = [
    "Dump Truck",
    "Excavator",
    "Mobile Crane",
    "Transit Mixer",
    "Wheel Loader",
    "Bulldozer",
    "Forklift",
    "Pickup Truck",
    "Lowbed Trailer",
    "Generator",
    "Compactor",
]

PLATE_CATEGORIES = [
    "Commercial",
    "Private",
    "Construction",
    "Government",
]

OWNERSHIP_TYPES = [
    "Company Owned",
    "Leased",
    "Rented",
    "Subcontractor",
]

KUWAIT_GOVERNORATES = [
    "Capital",
    "Hawalli",
    "Farwaniya",
    "Ahmadi",
    "Jahra",
    "Mubarak Al-Kabeer",
]

WORK_ORDER_PRIORITIES = ["Low", "Normal", "High", "Urgent"]
WORK_ORDER_STATUSES = [
    "Pending",
    "Approved",
    "In Progress",
    "Completed",
    "Released",
    "Rejected",
]

COMPLAINT_STATUSES = ["New", "Reviewed", "Approved", "Rejected"]
STOCK_TRANSACTION_KINDS = ["in", "issue", "return", "adjust"]
PURCHASE_STATUSES = ["Requested", "Approved", "Rejected", "Purchased", "Received"]
EXPENSE_KINDS = ["spare_part", "external_repair", "fuel", "insurance", "fahs_fanni", "misc"]
USER_ROLES = ["admin", "manager", "engineer", "technician", "operator", "viewer"]
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

DEFAULT_PORTS = {
    "BACKEND": 5000,
    "FRONTEND": 3000,
}

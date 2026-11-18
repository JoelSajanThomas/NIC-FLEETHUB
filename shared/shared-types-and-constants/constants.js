/**
 * NIC FleetHub - Shared Constants & Enums (ES Module)
 * Single source of truth for client and server constants.
 */

export const APP_NAME = "NIC FleetHub";
export const COMPANY_NAME = "National Industries Company (K.S.C.C)";
export const COUNTRY = "Kuwait";
export const BASE_CURRENCY = "KWD";
export const CURRENCY_DECIMALS = 3;

export const SUPPORTED_LANGUAGES = ["en", "hi", "ar"];
export const DEFAULT_LANGUAGE = "en";
export const RTL_LANGUAGES = ["ar"];

export const ASSET_STATUSES = [
  "Active",
  "Under Repair",
  "Out of Service",
  "Decommissioned"
];

export const ASSET_CATEGORIES = [
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
  "Compactor"
];

export const PLATE_CATEGORIES = [
  "Commercial",
  "Private",
  "Construction",
  "Government"
];

export const OWNERSHIP_TYPES = [
  "Company Owned",
  "Leased",
  "Rented",
  "Subcontractor"
];

export const KUWAIT_GOVERNORATES = [
  "Capital",
  "Hawalli",
  "Farwaniya",
  "Ahmadi",
  "Jahra",
  "Mubarak Al-Kabeer"
];

export const WORK_ORDER_PRIORITIES = ["Low", "Normal", "High", "Urgent"];
export const WORK_ORDER_STATUSES = [
  "Pending",
  "Approved",
  "In Progress",
  "Completed",
  "Released",
  "Rejected"
];

export const COMPLAINT_STATUSES = ["New", "Reviewed", "Approved", "Rejected"];
export const STOCK_TRANSACTION_KINDS = ["in", "issue", "return", "adjust"];
export const PURCHASE_STATUSES = ["Requested", "Approved", "Rejected", "Purchased", "Received"];
export const EXPENSE_KINDS = ["spare_part", "external_repair", "fuel", "insurance", "fahs_fanni", "misc"];
export const USER_ROLES = ["admin", "manager", "engineer", "technician", "operator", "viewer"];
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const DEFAULT_PORTS = {
  BACKEND: 5000,
  FRONTEND: 3000
};

export default {
  APP_NAME,
  COMPANY_NAME,
  COUNTRY,
  BASE_CURRENCY,
  CURRENCY_DECIMALS,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  RTL_LANGUAGES,
  ASSET_STATUSES,
  ASSET_CATEGORIES,
  PLATE_CATEGORIES,
  OWNERSHIP_TYPES,
  KUWAIT_GOVERNORATES,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  COMPLAINT_STATUSES,
  STOCK_TRANSACTION_KINDS,
  PURCHASE_STATUSES,
  EXPENSE_KINDS,
  USER_ROLES,
  MAX_FILE_SIZE_BYTES,
  DEFAULT_PORTS
};

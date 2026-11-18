"""Data schemas and representations for NIC FleetHub entities."""

ASSET_SCHEMA = {
    "required": ["name", "category"],
    "fields": [
        "name", "category", "equipment_type", "manufacturer", "brand", "model",
        "year", "reg_no", "plate_category", "vin", "engine_no", "serial_no",
        "operator", "civil_id_operator", "department", "worksite_id", "status",
        "purchase_date", "purchase_cost", "insurance_company", "insurance_policy",
        "insurance_expiry", "inspection_expiry", "reg_expiry", "warranty_details",
        "remarks", "country", "governorate", "paci_no"
    ]
}

COMPLAINT_SCHEMA = {
    "required": ["asset_id", "description"],
    "fields": ["asset_id", "driver", "location", "category", "description", "priority"]
}

WORK_ORDER_SCHEMA = {
    "required": ["asset_id", "description"],
    "fields": ["asset_id", "complaint_id", "category", "description", "priority", "assignee"]
}

PART_SCHEMA = {
    "required": ["name"],
    "fields": ["stock_id", "name", "category", "manufacturer", "oem_no", "compat", "unit", "min_qty", "unit_cost", "location", "supplier_id"]
}

PURCHASE_SCHEMA = {
    "required": ["part_name", "qty"],
    "fields": ["asset_id", "wo_id", "part_id", "part_name", "qty", "est_price", "currency", "supplier", "supplier_id", "to_stock"]
}

EXPENSE_SCHEMA = {
    "required": ["kind", "amount"],
    "fields": ["asset_id", "wo_id", "kind", "amount", "currency", "ref", "note"]
}

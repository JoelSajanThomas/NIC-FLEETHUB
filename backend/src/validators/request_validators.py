"""Input validation utilities for backend request handling."""
from ..middleware.error_middleware import Bad

def validate_required_fields(data, required_fields):
    """Validate that specified required fields exist and are non-empty."""
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        raise Bad(f"Missing required fields: {', '.join(missing)}", 400)

def validate_positive_number(val, field_name="Amount"):
    """Ensure value is a positive number."""
    try:
        num = float(val)
        if num <= 0:
            raise Bad(f"{field_name} must be greater than zero", 400)
        return num
    except (TypeError, ValueError):
        raise Bad(f"Invalid numeric value for {field_name}", 400)

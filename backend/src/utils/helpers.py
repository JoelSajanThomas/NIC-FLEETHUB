"""Helper utilities for NIC FleetHub backend."""
from datetime import datetime
import csv, io
from flask import Response, request

def now():
    """Return formatted current timestamp string."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def P():
    """Extract request parameters from JSON body, form data, or query string."""
    data = request.get_json(silent=True)
    if data is not None:
        return data
    if request.form:
        return request.form.to_dict()
    if request.args:
        return request.args.to_dict()
    return {}

def make_csv_response(filename, headers, data_rows):
    """Generate a downloadable CSV response."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for r in data_rows:
        writer.writerow(r)
    output.seek(0)
    return Response(
        output.getvalue().encode("utf-8-sig"),
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

def parse_csv_file(file_obj):
    """Safely parse uploaded CSV file into header and rows."""
    content = file_obj.read()
    if isinstance(content, bytes):
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = content.decode("latin-1")
    else:
        text = str(content)
    stream = io.StringIO(text)
    reader = csv.reader(stream)
    rows = [r for r in reader if r and any(cell.strip() for cell in r)]
    if not rows:
        return [], []
    headers = [h.strip() for h in rows[0]]
    data = [[c.strip() for c in r] for r in rows[1:]]
    return headers, data

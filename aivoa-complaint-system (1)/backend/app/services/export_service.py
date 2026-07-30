import csv
import io

from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from app.models.complaint import Complaint

FIELD_LABELS = [
    ("reference_code", "Reference Code"),
    ("status", "Status"),
    ("complaint_source", "Complaint Source"),
    ("customer_name", "Customer Name"),
    ("product_name", "Product Name"),
    ("product_strength", "Product Strength/Grade"),
    ("batch_number", "Batch/Lot Number"),
    ("manufacturing_date", "Manufacturing Date"),
    ("expiry_date", "Expiry Date"),
    ("affected_quantity", "Affected Quantity"),
    ("complaint_type", "Complaint Type"),
    ("complaint_date", "Complaint Date"),
    ("complaint_description", "Complaint Description"),
    ("structured_defect_summary", "Structured Defect Summary"),
    ("initial_severity", "Initial Severity"),
    ("priority", "Priority"),
    ("risk_severity_suggested", "AI Suggested Severity"),
    ("suggested_next_action", "AI Suggested Next Action"),
    ("initial_risk_assessment", "AI Risk Assessment"),
    ("root_cause_recommendation", "AI Root Cause Recommendation"),
    ("capa_recommendation", "AI CAPA Recommendation"),
    ("ai_summary", "AI Summary"),
]


def complaint_to_dict(c: Complaint) -> dict:
    return {label: (getattr(c, key) or "") for key, label in FIELD_LABELS}


def export_complaints_csv(complaints: list[Complaint]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([label for _, label in FIELD_LABELS])
    for c in complaints:
        row = complaint_to_dict(c)
        writer.writerow([row[label] for _, label in FIELD_LABELS])
    return buffer.getvalue().encode("utf-8")


def export_complaints_excel(complaints: list[Complaint]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Complaints"
    ws.append([label for _, label in FIELD_LABELS])
    for c in complaints:
        row = complaint_to_dict(c)
        ws.append([row[label] for _, label in FIELD_LABELS])
    for col_cells in ws.columns:
        length = max(len(str(cell.value or "")) for cell in col_cells)
        ws.column_dimensions[col_cells[0].column_letter].width = min(max(length + 2, 12), 50)
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def export_complaint_pdf(complaint: Complaint) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph(f"Customer Complaint Report — {complaint.reference_code}", styles["Title"]),
        Spacer(1, 12),
    ]
    data = [["Field", "Value"]]
    for key, label in FIELD_LABELS:
        value = getattr(complaint, key) or "-"
        data.append([label, str(value)])

    table = Table(data, colWidths=[180, 320])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F5F7")]),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    elements.append(table)
    doc.build(elements)
    return buffer.getvalue()

import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.audit import AuditLog
from app.models.user import User
from app.api.deps import get_current_user
from app.services.export_service import export_complaints_csv, export_complaints_excel, export_complaint_pdf

router = APIRouter(prefix="/api/export", tags=["export"])


def _log_export(db: Session, user: User, fmt: str, resource_id: str = "bulk"):
    db.add(AuditLog(
        user_id=user.id, user_email=user.email, action=f"EXPORT_{fmt.upper()}",
        resource_type="complaint", resource_id=resource_id,
    ))
    db.commit()


@router.get("/csv")
def export_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaints = db.query(Complaint).order_by(Complaint.created_at.desc()).all()
    content = export_complaints_csv(complaints)
    _log_export(db, current_user, "csv")
    return Response(
        content=content, media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=complaints_export.csv"},
    )


@router.get("/excel")
def export_excel(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaints = db.query(Complaint).order_by(Complaint.created_at.desc()).all()
    content = export_complaints_excel(complaints)
    _log_export(db, current_user, "excel")
    return Response(
        content=content, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=complaints_export.xlsx"},
    )


@router.get("/pdf/{complaint_id}")
def export_pdf(complaint_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    content = export_complaint_pdf(complaint)
    _log_export(db, current_user, "pdf", str(complaint_id))
    return Response(
        content=content, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={complaint.reference_code}.pdf"},
    )

import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.complaint import Complaint, TimelineEvent
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate, ComplaintOut, ComplaintListItem, TimelineEventOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/complaints", tags=["complaints"])


def _next_reference_code(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(Complaint).filter(Complaint.reference_code.like(f"CC-{year}-%")).count()
    return f"CC-{year}-{count + 1:05d}"


@router.post("", response_model=ComplaintOut, status_code=201)
def create_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = Complaint(
        reference_code=_next_reference_code(db),
        created_by_id=current_user.id,
        status="Pending Triage",
        **payload.model_dump(),
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    db.add(TimelineEvent(
        complaint_id=complaint.id, event_type="created",
        description="Complaint record created", actor=current_user.email,
    ))
    db.add(AuditLog(
        user_id=current_user.id, user_email=current_user.email, action="CREATE_COMPLAINT",
        resource_type="complaint", resource_id=str(complaint.id),
    ))
    db.commit()
    return complaint


@router.get("", response_model=List[ComplaintListItem])
def list_complaints(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Complaint)
    if status_filter:
        q = q.filter(Complaint.status == status_filter)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (Complaint.customer_name.ilike(like))
            | (Complaint.product_name.ilike(like))
            | (Complaint.batch_number.ilike(like))
            | (Complaint.reference_code.ilike(like))
        )
    return q.order_by(Complaint.created_at.desc()).all()


@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(complaint_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@router.patch("/{complaint_id}", response_model=ComplaintOut)
def update_complaint(
    complaint_id: uuid.UUID,
    payload: ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    updates = payload.model_dump(exclude_unset=True)
    changed_fields = []
    for key, value in updates.items():
        if getattr(complaint, key, None) != value:
            setattr(complaint, key, value)
            changed_fields.append(key)

    complaint.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(complaint)

    if changed_fields:
        db.add(TimelineEvent(
            complaint_id=complaint.id, event_type="field_corrected",
            description=f"Updated fields: {', '.join(changed_fields)}", actor=current_user.email,
        ))
        db.add(AuditLog(
            user_id=current_user.id, user_email=current_user.email, action="EDIT_COMPLAINT",
            resource_type="complaint", resource_id=str(complaint.id),
            details={"changed_fields": changed_fields},
        ))
        db.commit()
    return complaint


@router.post("/{complaint_id}/commit", response_model=ComplaintOut)
def commit_complaint(complaint_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.status = "Committed"
    complaint.committed_at = datetime.utcnow()
    db.commit()
    db.refresh(complaint)

    db.add(TimelineEvent(
        complaint_id=complaint.id, event_type="committed",
        description="Complaint committed to QMS ledger", actor=current_user.email,
    ))
    db.add(AuditLog(
        user_id=current_user.id, user_email=current_user.email, action="COMMIT_COMPLAINT",
        resource_type="complaint", resource_id=str(complaint.id),
    ))
    db.commit()
    return complaint


@router.get("/{complaint_id}/timeline", response_model=List[TimelineEventOut])
def get_timeline(complaint_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    events = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.complaint_id == complaint_id)
        .order_by(TimelineEvent.created_at.asc())
        .all()
    )
    return events


@router.delete("/{complaint_id}", status_code=204)
def delete_complaint(complaint_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    db.delete(complaint)
    db.add(AuditLog(
        user_id=current_user.id, user_email=current_user.email, action="DELETE_COMPLAINT",
        resource_type="complaint", resource_id=str(complaint_id),
    ))
    db.commit()
    return None

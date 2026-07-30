from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid
from datetime import datetime

from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/audit", tags=["audit"])


class AuditLogOut(BaseModel):
    id: uuid.UUID
    user_email: Optional[str]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    action: Optional[str] = None,
    resource_id: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if resource_id:
        q = q.filter(AuditLog.resource_id == resource_id)
    return q.order_by(AuditLog.created_at.desc()).limit(limit).all()

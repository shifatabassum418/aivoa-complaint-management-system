from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = db.query(Complaint).count()
    by_status = dict(db.query(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status).all())
    by_severity = dict(
        db.query(Complaint.risk_severity_suggested, func.count(Complaint.id))
        .group_by(Complaint.risk_severity_suggested).all()
    )
    by_priority = dict(db.query(Complaint.priority, func.count(Complaint.id)).group_by(Complaint.priority).all())
    duplicates = db.query(Complaint).filter(Complaint.is_duplicate == 1).count()
    committed = db.query(Complaint).filter(Complaint.status == "Committed").count()
    avg_completeness = db.query(func.avg(Complaint.completeness_score)).scalar() or 0.0

    recent = (
        db.query(Complaint)
        .order_by(Complaint.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "total_complaints": total,
        "by_status": by_status,
        "by_severity": by_severity,
        "by_priority": by_priority,
        "duplicate_count": duplicates,
        "committed_count": committed,
        "average_completeness": round(float(avg_completeness), 2),
        "recent": [
            {
                "id": str(c.id),
                "reference_code": c.reference_code,
                "product_name": c.product_name,
                "status": c.status,
                "created_at": c.created_at.isoformat(),
            }
            for c in recent
        ],
    }

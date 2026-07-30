import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ComplaintBase(BaseModel):
    complaint_source: Optional[str] = None
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    product_strength: Optional[str] = None
    batch_number: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    affected_quantity: Optional[str] = None
    originating_site_block: Optional[str] = None
    impacted_npm: Optional[str] = None
    complaint_type: Optional[str] = None
    complaint_date: Optional[str] = None
    complaint_description: Optional[str] = None
    structured_defect_summary: Optional[str] = None
    initial_severity: Optional[str] = None
    priority: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    pass


class ComplaintUpdate(ComplaintBase):
    status: Optional[str] = None


class ComplaintOut(ComplaintBase):
    id: uuid.UUID
    reference_code: Optional[str]
    risk_severity_suggested: Optional[str]
    suggested_next_action: Optional[str]
    initial_risk_assessment: Optional[str]
    root_cause_recommendation: Optional[str]
    capa_recommendation: Optional[str]
    ai_summary: Optional[str]
    completeness_score: Optional[float]
    missing_fields: Optional[list]
    is_duplicate: Optional[int]
    duplicate_of_id: Optional[uuid.UUID]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TimelineEventOut(BaseModel):
    id: uuid.UUID
    event_type: str
    description: str
    actor: str
    created_at: datetime

    class Config:
        from_attributes = True


class ComplaintListItem(BaseModel):
    id: uuid.UUID
    reference_code: Optional[str]
    customer_name: Optional[str]
    product_name: Optional[str]
    complaint_type: Optional[str]
    priority: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

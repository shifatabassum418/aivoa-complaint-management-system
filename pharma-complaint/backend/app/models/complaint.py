import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, JSON, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference_code = Column(String(50), unique=True, index=True)  # e.g. CC-2026-00154

    # 1. Origin & customer details
    complaint_source = Column(String(50))  # Email, Pharmacy, Phone, Portal
    customer_name = Column(String(255))

    # 2. Product & batch identification
    product_name = Column(String(255))
    product_strength = Column(String(100))
    batch_number = Column(String(100), index=True)
    manufacturing_date = Column(String(50))
    expiry_date = Column(String(50))
    affected_quantity = Column(String(100))

    # 3. Facility & material impact
    originating_site_block = Column(String(255))
    impacted_npm = Column(String(255))

    # 4. Complaint / defect details
    complaint_type = Column(String(100))
    complaint_date = Column(String(50))
    complaint_description = Column(Text)
    structured_defect_summary = Column(Text)

    # 5. Initial assessment & priority
    initial_severity = Column(String(50))  # Minor, Major, Critical
    priority = Column(String(50))  # Low, Medium, High, Urgent

    # AI-generated fields
    risk_severity_suggested = Column(String(50))
    suggested_next_action = Column(String(255))
    initial_risk_assessment = Column(Text)
    root_cause_recommendation = Column(Text)
    capa_recommendation = Column(Text)
    ai_summary = Column(Text)
    completeness_score = Column(Float, default=0.0)
    missing_fields = Column(JSON, default=list)
    is_duplicate = Column(Integer, default=0)  # 0/1 boolean flag (portable across DBs)
    duplicate_of_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id"), nullable=True)

    status = Column(String(50), default="Pending Triage")  # Pending Triage, Ready to Commit, Committed, Closed

    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    committed_at = Column(DateTime, nullable=True)

    attachments = relationship("ComplaintAttachment", back_populates="complaint", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="complaint", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="complaint", cascade="all, delete-orphan")


class ComplaintAttachment(Base):
    __tablename__ = "complaint_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id"))
    filename = Column(String(500))
    file_path = Column(String(1000))
    content_type = Column(String(100))
    ocr_extracted_text = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="attachments")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id"), nullable=True)
    session_id = Column(String(100), index=True)  # groups messages before a complaint exists
    role = Column(String(20))  # user, assistant
    content = Column(Text)
    node_trace = Column(JSON, nullable=True)  # which LangGraph nodes ran for this turn
    created_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="chat_messages")


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id"))
    event_type = Column(String(100))  # created, ai_extracted, field_corrected, risk_assessed, committed, exported
    description = Column(Text)
    actor = Column(String(255))  # "AI Copilot" or user email
    created_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="timeline_events")

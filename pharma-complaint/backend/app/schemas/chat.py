import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ChatMessageIn(BaseModel):
    session_id: str
    message: str
    complaint_id: Optional[uuid.UUID] = None
    current_form_state: Optional[Dict[str, Any]] = None


class ChatMessageOut(BaseModel):
    session_id: str
    reply: str
    form_updates: Dict[str, Any] = {}
    risk_assessment: Optional[Dict[str, Any]] = None
    completeness: Optional[Dict[str, Any]] = None
    duplicate_check: Optional[Dict[str, Any]] = None
    root_cause: Optional[str] = None
    capa: Optional[str] = None
    summary: Optional[str] = None
    node_trace: List[str] = []
    complaint_id: Optional[uuid.UUID] = None


class ExtractionRequest(BaseModel):
    session_id: str
    complaint_id: Optional[uuid.UUID] = None
    raw_text: str

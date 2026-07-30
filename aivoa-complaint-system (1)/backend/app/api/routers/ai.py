import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.complaint import Complaint, ComplaintAttachment, ChatMessage
from app.models.user import User
from app.schemas.chat import ChatMessageIn, ChatMessageOut
from app.api.deps import get_current_user
from app.services.ai.ocr import extract_text_from_upload
from app.services.ai.workflow import compiled_graph

router = APIRouter(prefix="/api/ai", tags=["ai-copilot"])


def _duplicate_candidates(db: Session, form_state: dict, exclude_id: Optional[str] = None):
    batch = form_state.get("batch_number")
    product = form_state.get("product_name")
    if not batch and not product:
        return []
    q = db.query(Complaint)
    if batch:
        q = q.filter(Complaint.batch_number == batch)
    elif product:
        q = q.filter(Complaint.product_name == product)
    if exclude_id:
        q = q.filter(Complaint.id != exclude_id)
    rows = q.order_by(Complaint.created_at.desc()).limit(10).all()
    return [
        {
            "id": str(r.id),
            "batch_number": r.batch_number,
            "product_name": r.product_name,
            "customer_name": r.customer_name,
            "complaint_type": r.complaint_type,
            "complaint_date": r.complaint_date,
        }
        for r in rows
    ]


def _run_graph_and_respond(
    db: Session,
    session_id: str,
    raw_text: str,
    uploaded_file_text: str,
    complaint_id: Optional[uuid.UUID],
    current_user: User,
) -> ChatMessageOut:
    complaint = None
    form_state = {}
    if complaint_id:
        complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if complaint:
            form_state = {
                "complaint_source": complaint.complaint_source,
                "customer_name": complaint.customer_name,
                "product_name": complaint.product_name,
                "product_strength": complaint.product_strength,
                "batch_number": complaint.batch_number,
                "manufacturing_date": complaint.manufacturing_date,
                "expiry_date": complaint.expiry_date,
                "affected_quantity": complaint.affected_quantity,
                "complaint_type": complaint.complaint_type,
                "complaint_date": complaint.complaint_date,
                "complaint_description": complaint.complaint_description,
            }

    candidates = _duplicate_candidates(db, form_state, str(complaint_id) if complaint_id else None)

    initial_state = {
        "session_id": session_id,
        "complaint_id": str(complaint_id) if complaint_id else None,
        "raw_input_text": raw_text,
        "uploaded_file_text": uploaded_file_text,
        "form_state": form_state,
        "duplicate_candidates": candidates,
    }

    result_state = compiled_graph.invoke(initial_state)
    final_form = result_state.get("form_state", {})

    # Persist: create the complaint on first turn, update on subsequent turns
    if complaint is None:
        year_count = db.query(Complaint).count()
        complaint = Complaint(
            reference_code=f"CC-{2026}-{year_count + 1:05d}",
            created_by_id=current_user.id,
            status="Pending Triage",
        )
        db.add(complaint)

    for key in [
        "complaint_source", "customer_name", "product_name", "product_strength",
        "batch_number", "manufacturing_date", "expiry_date", "affected_quantity",
        "complaint_type", "complaint_date", "complaint_description",
        "structured_defect_summary", "risk_severity_suggested", "suggested_next_action",
        "initial_risk_assessment", "root_cause_recommendation", "capa_recommendation",
        "completeness_score", "missing_fields", "is_duplicate", "duplicate_of_id",
    ]:
        if key in final_form and final_form[key] is not None:
            setattr(complaint, key, final_form[key])

    completeness = result_state.get("completeness", {})
    if completeness.get("ready_to_commit"):
        complaint.status = "Ready to Commit"

    db.commit()
    db.refresh(complaint)

    db.add(ChatMessage(complaint_id=complaint.id, session_id=session_id, role="user", content=raw_text or "[file upload]"))
    db.add(ChatMessage(
        complaint_id=complaint.id, session_id=session_id, role="assistant",
        content=result_state.get("assistant_reply", ""), node_trace=result_state.get("node_trace", []),
    ))
    db.commit()

    return ChatMessageOut(
        session_id=session_id,
        reply=result_state.get("assistant_reply", "Processed."),
        form_updates=final_form,
        risk_assessment=result_state.get("risk_assessment"),
        completeness=result_state.get("completeness"),
        duplicate_check=result_state.get("duplicate_check"),
        root_cause=(result_state.get("root_cause") or {}).get("root_cause_recommendation"),
        capa=(result_state.get("capa") or {}).get("capa_recommendation"),
        summary=(result_state.get("summary") or {}).get("structured_defect_summary"),
        node_trace=result_state.get("node_trace", []),
        complaint_id=complaint.id,
    )


@router.post("/chat", response_model=ChatMessageOut)
def chat(payload: ChatMessageIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _run_graph_and_respond(
        db=db,
        session_id=payload.session_id,
        raw_text=payload.message,
        uploaded_file_text="",
        complaint_id=payload.complaint_id,
        current_user=current_user,
    )


@router.post("/upload", response_model=ChatMessageOut)
async def upload_document(
    session_id: str = Form(...),
    complaint_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    file_bytes = await file.read()
    if len(file_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_MB}MB limit")

    extracted_text = extract_text_from_upload(file.filename, file.content_type or "", file_bytes)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    saved_name = f"{uuid.uuid4()}_{file.filename}"
    saved_path = os.path.join(settings.UPLOAD_DIR, saved_name)
    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    parsed_complaint_id = uuid.UUID(complaint_id) if complaint_id else None

    result = _run_graph_and_respond(
        db=db,
        session_id=session_id,
        raw_text="",
        uploaded_file_text=extracted_text,
        complaint_id=parsed_complaint_id,
        current_user=current_user,
    )

    db.add(ComplaintAttachment(
        complaint_id=result.complaint_id, filename=file.filename, file_path=saved_path,
        content_type=file.content_type, ocr_extracted_text=extracted_text,
    ))
    db.commit()

    return result

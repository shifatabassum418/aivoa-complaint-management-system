"""
LangGraph workflow for the AIVOA Complaint Intake Copilot.

Graph shape (linear pipeline with conditional short-circuits):

    upload -> ocr -> parsing -> extraction -> validation -> risk_assessment
           -> completeness_checker -> duplicate_detection -> root_cause
           -> capa -> summary -> populate_form -> END

Each node reads/writes a shared `GraphState` TypedDict. Nodes that need an
LLM call use `call_groq_json`, which transparently retries on the fallback
model (llama-3.3-70b-versatile) if the primary model (gemma2-9b-it) fails.

The graph is re-entrant: on every follow-up chat turn (a correction, a new
paste, a new upload) the caller invokes the same compiled graph with the
previous form_state merged in, so corrections only overwrite the fields the
user actually mentioned.
"""
from typing import TypedDict, Optional, List, Dict, Any

from langgraph.graph import StateGraph, END

from app.services.ai.groq_client import call_groq_json
from app.services.ai import prompts


class GraphState(TypedDict, total=False):
    session_id: str
    complaint_id: Optional[str]
    raw_input_text: str          # pasted text or user chat message
    uploaded_file_text: str      # OCR'd/extracted text from an attachment, if any
    is_correction: bool          # true if this turn is a follow-up correction, not fresh intake
    form_state: Dict[str, Any]   # accumulated form fields so far
    extraction_result: Dict[str, Any]
    validation_errors: List[str]
    risk_assessment: Dict[str, Any]
    completeness: Dict[str, Any]
    duplicate_candidates: List[Dict[str, Any]]
    duplicate_check: Dict[str, Any]
    root_cause: Dict[str, Any]
    capa: Dict[str, Any]
    summary: Dict[str, Any]
    assistant_reply: str
    node_trace: List[str]


REQUIRED_FIELDS = [
    "complaint_source", "customer_name", "product_name", "product_strength",
    "batch_number", "manufacturing_date", "expiry_date", "affected_quantity",
    "complaint_type", "complaint_date", "complaint_description",
]


def node_upload(state: GraphState) -> GraphState:
    """Marks whether this turn includes a fresh document upload vs plain chat text."""
    state.setdefault("node_trace", []).append("upload")
    state["uploaded_file_text"] = state.get("uploaded_file_text", "")
    return state


def node_ocr(state: GraphState) -> GraphState:
    """OCR already ran upstream in the API layer (see ocr.py) before invoking the graph;
    this node simply folds the extracted text into the working text buffer."""
    state.setdefault("node_trace", []).append("ocr")
    return state


def node_parsing(state: GraphState) -> GraphState:
    """Combines raw chat text and any uploaded/OCR'd document text into a single
    text blob for the extraction node, and decides if this is a correction turn."""
    state.setdefault("node_trace", []).append("parsing")
    combined = "\n\n".join(filter(None, [
        state.get("uploaded_file_text", ""),
        state.get("raw_input_text", ""),
    ])).strip()
    state["raw_input_text"] = combined
    # Heuristic: if there's already a populated form and the new text is short,
    # treat this as a correction so the extraction prompt merges instead of overwrites.
    existing_form = state.get("form_state") or {}
    has_existing_data = any(existing_form.get(f) for f in REQUIRED_FIELDS)
    state["is_correction"] = has_existing_data and len(combined) < 400
    return state


def node_extraction(state: GraphState) -> GraphState:
    state.setdefault("node_trace", []).append("extraction")
    user_prompt = (
        f"CURRENT FORM STATE (JSON, may be empty): {state.get('form_state', {})}\n\n"
        f"IS THIS A CORRECTION TURN: {state.get('is_correction', False)}\n\n"
        f"NEW TEXT TO PROCESS:\n{state.get('raw_input_text', '')}"
    )
    result = call_groq_json(prompts.EXTRACTION_SYSTEM_PROMPT, user_prompt)
    state["extraction_result"] = result
    state["assistant_reply"] = result.get("assistant_reply", "I've processed the complaint details.")

    # Merge extracted (non-null) fields into the running form_state
    form_state = dict(state.get("form_state") or {})
    for key, value in result.items():
        if key in REQUIRED_FIELDS and value not in (None, "", "null"):
            form_state[key] = value
    state["form_state"] = form_state
    return state


def node_validation(state: GraphState) -> GraphState:
    """Basic structural validation (not LLM-based): flags obviously malformed values."""
    state.setdefault("node_trace", []).append("validation")
    errors = []
    form = state.get("form_state", {})
    qty = form.get("affected_quantity", "") or ""
    if qty and not any(ch.isdigit() for ch in qty):
        errors.append("affected_quantity does not contain a numeric value")
    state["validation_errors"] = errors
    return state


def node_risk_assessment(state: GraphState) -> GraphState:
    state.setdefault("node_trace", []).append("risk_assessment")
    form = state.get("form_state", {})
    if not form.get("complaint_description") and not form.get("product_name"):
        state["risk_assessment"] = {}
        return state
    user_prompt = f"Complaint details: {form}"
    result = call_groq_json(prompts.RISK_ASSESSMENT_SYSTEM_PROMPT, user_prompt)
    state["risk_assessment"] = result
    return state


def node_completeness_checker(state: GraphState) -> GraphState:
    state.setdefault("node_trace", []).append("completeness_checker")
    form = state.get("form_state", {})
    user_prompt = f"Current form fields: {form}\nRequired fields: {REQUIRED_FIELDS}"
    result = call_groq_json(prompts.COMPLETENESS_SYSTEM_PROMPT, user_prompt)
    state["completeness"] = result
    return state


def node_duplicate_detection(state: GraphState) -> GraphState:
    state.setdefault("node_trace", []).append("duplicate_detection")
    candidates = state.get("duplicate_candidates", [])
    if not candidates:
        state["duplicate_check"] = {"is_duplicate": False, "duplicate_of_id": None, "reason": "No prior complaints to compare."}
        return state
    form = state.get("form_state", {})
    user_prompt = f"CURRENT complaint: {form}\n\nCANDIDATE prior complaints: {candidates}"
    result = call_groq_json(prompts.DUPLICATE_SYSTEM_PROMPT, user_prompt)
    state["duplicate_check"] = result
    return state


def node_root_cause(state: GraphState) -> GraphState:
    state.setdefault("node_trace", []).append("root_cause")
    form = state.get("form_state", {})
    if not form.get("complaint_description"):
        state["root_cause"] = {}
        return state
    user_prompt = f"Complaint details: {form}\nRisk assessment: {state.get('risk_assessment', {})}"
    result = call_groq_json(prompts.ROOT_CAUSE_SYSTEM_PROMPT, user_prompt)
    state["root_cause"] = result
    return state


def node_capa(state: GraphState) -> GraphState:
    state.setdefault("node_trace", []).append("capa")
    if not state.get("root_cause"):
        state["capa"] = {}
        return state
    user_prompt = (
        f"Complaint details: {state.get('form_state', {})}\n"
        f"Root cause recommendation: {state.get('root_cause', {})}"
    )
    result = call_groq_json(prompts.CAPA_SYSTEM_PROMPT, user_prompt)
    state["capa"] = result
    return state


def node_summary(state: GraphState) -> GraphState:
    state.setdefault("node_trace", []).append("summary")
    form = state.get("form_state", {})
    if not form.get("complaint_description"):
        state["summary"] = {}
        return state
    user_prompt = (
        f"Form fields: {form}\n"
        f"Risk assessment: {state.get('risk_assessment', {})}\n"
        f"Root cause: {state.get('root_cause', {})}\n"
        f"CAPA: {state.get('capa', {})}"
    )
    result = call_groq_json(prompts.SUMMARY_SYSTEM_PROMPT, user_prompt)
    state["summary"] = result
    return state


def node_populate_form(state: GraphState) -> GraphState:
    """Terminal node: folds all AI outputs into the final form_state dict that
    the API layer will merge into the Complaint row."""
    state.setdefault("node_trace", []).append("populate_form")
    form_state = dict(state.get("form_state") or {})

    risk = state.get("risk_assessment") or {}
    if risk:
        form_state["risk_severity_suggested"] = risk.get("severity_suggested")
        form_state["suggested_next_action"] = risk.get("suggested_next_action")
        form_state["initial_risk_assessment"] = risk.get("initial_risk_assessment")

    root_cause = state.get("root_cause") or {}
    if root_cause:
        form_state["root_cause_recommendation"] = root_cause.get("root_cause_recommendation")

    capa = state.get("capa") or {}
    if capa:
        form_state["capa_recommendation"] = capa.get("capa_recommendation")

    summary = state.get("summary") or {}
    if summary:
        form_state["structured_defect_summary"] = summary.get("structured_defect_summary")

    completeness = state.get("completeness") or {}
    if completeness:
        form_state["completeness_score"] = completeness.get("completeness_score")
        form_state["missing_fields"] = completeness.get("missing_fields", [])

    dup = state.get("duplicate_check") or {}
    if dup:
        form_state["is_duplicate"] = 1 if dup.get("is_duplicate") else 0
        form_state["duplicate_of_id"] = dup.get("duplicate_of_id")

    state["form_state"] = form_state
    return state
def build_graph():
    graph = StateGraph(GraphState)

    graph.add_node("upload", node_upload)
    graph.add_node("ocr", node_ocr)
    graph.add_node("parsing", node_parsing)
    graph.add_node("extraction", node_extraction)
    graph.add_node("validation", node_validation)
    graph.add_node("risk_assessment_node", node_risk_assessment)
    graph.add_node("completeness_checker", node_completeness_checker)
    graph.add_node("duplicate_detection", node_duplicate_detection)
    graph.add_node("root_cause_node", node_root_cause)
    graph.add_node("capa_node", node_capa)
    graph.add_node("summary_node", node_summary)
    graph.add_node("populate_form", node_populate_form)

    graph.set_entry_point("upload")
    graph.add_edge("upload", "ocr")
    graph.add_edge("ocr", "parsing")
    graph.add_edge("parsing", "extraction")
    graph.add_edge("extraction", "validation")
    graph.add_edge("validation", "risk_assessment_node")
    graph.add_edge("risk_assessment_node", "completeness_checker")
    graph.add_edge("completeness_checker", "duplicate_detection")
    graph.add_edge("duplicate_detection", "root_cause_node")
    graph.add_edge("root_cause_node", "capa_node")
    graph.add_edge("capa_node", "summary_node")
    graph.add_edge("summary_node", "populate_form")
    graph.add_edge("populate_form", END)

    return graph.compile()
compiled_graph = build_graph()
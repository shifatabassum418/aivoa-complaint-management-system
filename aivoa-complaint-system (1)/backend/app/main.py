import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routers import auth, complaints, ai, export, audit, dashboard

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="AIVOA Customer Complaint Management System",
    description=(
        "AI-powered pharmaceutical customer complaint intake and QMS system. "
        "Combines a conversational AI Copilot (LangGraph + Groq) with a structured "
        "QA complaint form, risk assessment, duplicate detection, root cause and "
        "CAPA recommendations, and full audit trail."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(ai.router)
app.include_router(export.router)
app.include_router(audit.router)
app.include_router(dashboard.router)


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": "aivoa-complaint-system"}

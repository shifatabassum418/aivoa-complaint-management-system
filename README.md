# AIVOA — AI-Powered Customer Complaint Management System

[Watch the demo video](https://drive.google.com/file/d/1YHAhd7PKjjA59fjo5vwQD3A8QjtV9x1l/view?usp=drivesdk)

[Live app](https://aivoa-complaint-management-system-3.onrender.com)


A production-grade pharmaceutical customer complaint intake and QMS (Quality Management System) platform. A QA analyst pastes a customer email or uploads a scanned complaint PDF into the **AIVOA Copilot** chat panel; a LangGraph pipeline backed by Groq LLMs extracts structured fields, runs a risk assessment, checks completeness, screens for duplicates, and recommends a root cause and CAPA — all while incrementally populating an editable form on the left.

---

## 1. Architecture Overview

Clean/layered architecture, split into two independently deployable services that talk only over REST:

```
frontend (React 19)  ── HTTPS/JSON ──▶  backend (FastAPI)  ──▶  PostgreSQL
                                              │
                                              ▼
                                     LangGraph pipeline ──▶ Groq (gemma2-9b-it → llama-3.3-70b-versatile fallback)
```

**Backend layers** (`backend/app/`):
- `api/routers/` — HTTP boundary only (FastAPI routes, request/response schemas). No business logic.
- `services/` — business logic: `export_service.py` (PDF/Excel/CSV), `services/ai/` (Groq client, prompts, OCR, LangGraph workflow).
- `models/` — SQLAlchemy ORM entities (persistence layer).
- `schemas/` — Pydantic DTOs (API contracts), decoupled from ORM models.
- `core/` — cross-cutting config and security (JWT, bcrypt).

**Frontend layers** (`frontend/src/`):
- `pages/` — route-level screens, own data fetching via Redux thunks.
- `components/` — presentational + container components, no direct API calls except through the shared `apiClient`.
- `store/` — Redux Toolkit slices are the single source of truth for auth, complaint form state, chat state, and UI (dark mode) state. The frontend never talks to Groq/LangGraph directly — every AI interaction goes through `/api/ai/*`.

---

## 2. LangGraph Workflow

The AI pipeline is a single compiled `StateGraph` (`backend/app/services/ai/workflow.py`) invoked on every chat turn and every file upload:

```
upload → ocr → parsing → extraction → validation → risk_assessment
       → completeness_checker → duplicate_detection → root_cause
       → capa → summary → populate_form → END
```

| Node | Responsibility | LLM call? |
|---|---|---|
| `upload` | Marks whether this turn includes a fresh file | No |
| `ocr` | Folds OCR'd/extracted document text into the working buffer (actual OCR runs in `services/ai/ocr.py` before the graph is invoked, using `pytesseract` + `pdf2image`, with native PDF text-layer extraction via `pypdf` tried first) | No |
| `parsing` | Merges chat text + document text; heuristically flags the turn as a **correction** (short message + form already has data) vs. **fresh intake** | No |
| `extraction` | Extracts structured fields into the form JSON schema. On a correction turn, only mentioned fields are returned non-null so the merge never clobbers existing data | Yes |
| `validation` | Deterministic structural checks (e.g. quantity fields must contain a digit) | No |
| `risk_assessment` | Suggests severity (Minor/Major/Critical), next action, and a plain-English risk narrative | Yes |
| `completeness_checker` | Scores 0–1 completeness against 11 required fields, lists missing ones, flags `ready_to_commit` | Yes |
| `duplicate_detection` | Compares the current batch/product against up to 10 candidate prior complaints (fetched from Postgres by the router before invoking the graph) | Yes |
| `root_cause` | Recommends a GMP failure-mode category (packaging seal failure, moisture ingress, cross-contamination, etc.) | Yes |
| `capa` | Produces a CAPA plan: immediate correction, preventive action, verification step | Yes |
| `summary` | Writes the formal `structured_defect_summary` for the QMS ledger | Yes |
| `populate_form` | Terminal node — folds every AI output into the final `form_state` dict returned to the API layer | No |

**Re-entrancy:** the same compiled graph is invoked on every turn. The caller (`api/routers/ai.py`) loads the complaint's current field values into `form_state` before invoking the graph, so a follow-up message like "ah sorry the batch number is BMX240602 and affected quantity is 48 capsules" only overwrites those two fields — this is what makes the "editable form via chat corrections" feature work.

### Model fallback strategy

`services/ai/groq_client.py` always tries `GROQ_PRIMARY_MODEL` (`gemma2-9b-it`) first. If Groq raises an API error, rate limit, or connection error, it transparently retries the exact same prompt against `GROQ_FALLBACK_MODEL` (`llama-3.3-70b-versatile`) before giving up. Every LLM node in the graph goes through `call_groq_json`, so the fallback is automatic and uniform across the whole pipeline — no per-node special-casing needed.

### Prompts

All prompts live in `backend/app/services/ai/prompts.py` (not inlined in the graph) so they can be reviewed, versioned, and unit-tested independently: `EXTRACTION_SYSTEM_PROMPT`, `RISK_ASSESSMENT_SYSTEM_PROMPT`, `COMPLETENESS_SYSTEM_PROMPT`, `DUPLICATE_SYSTEM_PROMPT`, `ROOT_CAUSE_SYSTEM_PROMPT`, `CAPA_SYSTEM_PROMPT`, `SUMMARY_SYSTEM_PROMPT`. Every prompt instructs the model to return JSON only, and `call_groq_json` uses Groq's `response_format: json_object` plus a markdown-fence-stripping fallback parser.

---

## 3. Database Schema (PostgreSQL via SQLAlchemy + Alembic)

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Auth + roles | `email` (unique), `hashed_password` (bcrypt), `role` (`qa_analyst` / `qa_manager` / `admin`) |
| `complaints` | The complaint record / form | `reference_code` (e.g. `CC-2026-00042`), all 4 form sections (origin, product/batch, defect, assessment), AI fields (`risk_severity_suggested`, `initial_risk_assessment`, `root_cause_recommendation`, `capa_recommendation`, `structured_defect_summary`, `completeness_score`, `missing_fields` JSON, `is_duplicate`, `duplicate_of_id` self-FK), `status` (`Pending Triage` → `Ready to Commit` → `Committed`) |
| `complaint_attachments` | Uploaded files | `file_path`, `content_type`, `ocr_extracted_text` |
| `chat_messages` | Full copilot conversation history | `session_id`, `role` (`user`/`assistant`), `node_trace` JSON (which LangGraph nodes ran) |
| `timeline_events` | Audit-friendly per-complaint history for the Timeline page | `event_type` (`created`, `field_corrected`, `committed`, ...), `actor` |
| `audit_logs` | System-wide security/action audit trail | `action` (`LOGIN`, `CREATE_COMPLAINT`, `EDIT_COMPLAINT`, `COMMIT_COMPLAINT`, `EXPORT_PDF`, ...), `details` JSON |

Migration: `backend/alembic/versions/0001_initial_schema.py` creates all six tables. Run with `alembic upgrade head`.

---

## 4. API Endpoints

Interactive docs are always available at `/api/docs` (Swagger UI) and `/api/redoc` once the backend is running.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create a user, returns JWT |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/complaints` | Create a blank/manual complaint |
| GET | `/api/complaints` | List complaints (filter by `status`, `search`) |
| GET | `/api/complaints/{id}` | Get one complaint |
| PATCH | `/api/complaints/{id}` | Edit fields (also used by the manual form save) |
| POST | `/api/complaints/{id}/commit` | Commit to the QMS ledger |
| GET | `/api/complaints/{id}/timeline` | Timeline events for a complaint |
| DELETE | `/api/complaints/{id}` | Delete a complaint |
| POST | `/api/ai/chat` | Send a chat message to the Copilot — runs the full LangGraph pipeline |
| POST | `/api/ai/upload` | Upload a PDF/DOCX/image/TXT complaint document — OCR + same pipeline |
| GET | `/api/export/csv` | Export all complaints as CSV |
| GET | `/api/export/excel` | Export all complaints as XLSX |
| GET | `/api/export/pdf/{id}` | Export a single complaint as a formatted PDF |
| GET | `/api/audit` | Audit log (filter by `action`, `resource_id`) |
| GET | `/api/dashboard/stats` | Aggregate stats for the dashboard |
| GET | `/api/health` | Health check |

All endpoints except `/auth/register`, `/auth/login`, and `/health` require `Authorization: Bearer <jwt>`.

---

## 5. Feature Checklist

1. AI Copilot Chat — `CopilotChat.jsx` + `/api/ai/chat`
2. PDF Upload — drag-and-drop or click-to-browse in the Copilot panel
3. Email Parsing — pasted raw email text is parsed by the `extraction` node
4. OCR — `services/ai/ocr.py`, `pytesseract` + `pdf2image`, with native PDF text-layer extraction tried first
5. AI Extraction — `extraction` node
6. Complaint Form Auto Population — `populate_form` node then Redux `mergeFormUpdates`
7. Editable Form — `ComplaintForm.jsx` (React Hook Form, MUI)
8. Follow-up Chat Corrections — re-entrant graph invocation with the `is_correction` heuristic
9. Risk Assessment — `risk_assessment` node + `RiskAssessmentCard.jsx`
10. Complaint Summary — `summary` node, produces `structured_defect_summary`
11. Duplicate Complaint Detection — `duplicate_detection` node, compares batch/product against prior complaints
12. Complaint Completeness Checker — `completeness_checker` node, drives the `Pending Triage → Ready to Commit` status transition
13. Root Cause Recommendation — `root_cause` node
14. CAPA Recommendation — `capa` node
15. Audit Log — `audit_logs` table + `/api/audit` + `AuditLogPage.jsx`
16. Timeline — `timeline_events` table + `/api/complaints/{id}/timeline` + `TimelinePage.jsx`
17. Dashboard — `/api/dashboard/stats` + `DashboardPage.jsx`
18. Authentication — JWT + bcrypt, `authSlice.js`, `LoginPage.jsx`
19. Dark Mode — `uiSlice.js`, persisted to `localStorage`, MUI theme + Tailwind `darkMode: 'class'`
20. Settings — `SettingsPage.jsx` (profile, dark mode toggle, export shortcuts)
21. Export PDF — `export_service.py::export_complaint_pdf` (reportlab)
22. Export Excel — `export_service.py::export_complaints_excel` (openpyxl)
23. Export CSV — `export_service.py::export_complaints_csv`
24. Swagger — auto-generated at `/api/docs`
25. Docker Compose — `docker-compose.yml` (Postgres + backend + frontend)

---

## 6. Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 16 (or use Docker Compose, see below)
- A Groq API key: https://console.groq.com/keys
- `tesseract-ocr` and `poppler-utils` installed locally if running the backend outside Docker (needed for OCR/PDF rasterization)

### Option A — Docker Compose (recommended)

```bash
cd aivoa-complaint-system
cp backend/.env.example backend/.env
# edit backend/.env and set GROQ_API_KEY

docker compose up --build
```

- Frontend: http://localhost:5173
- Backend Swagger docs: http://localhost:8000/api/docs
- Postgres is exposed on localhost:5432 (user aivoa_user / pass aivoa_pass / db aivoa_complaints)

The backend container runs `alembic upgrade head` automatically on startup before launching uvicorn.

### Option B — Manual local setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env: set DATABASE_URL to your local Postgres, and GROQ_API_KEY

# create the database first, e.g.: createdb aivoa_complaints
alembic upgrade head

uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Then open http://localhost:5173, register a user, and start logging complaints.

### Environment variables (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname` |
| `SECRET_KEY` | Random 64-char string for JWT signing |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT lifetime (default 1440 = 24h) |
| `GROQ_API_KEY` | Required for any AI feature to work |
| `GROQ_PRIMARY_MODEL` | Default `gemma2-9b-it` |
| `GROQ_FALLBACK_MODEL` | Default `llama-3.3-70b-versatile` |
| `FRONTEND_ORIGIN` | CORS allow-origin, default `http://localhost:5173` |
| `MAX_UPLOAD_MB` | Upload size limit, default `10` |
| `UPLOAD_DIR` | Where uploaded files are stored on disk |

---

## 7. Notes on Model Names

`gemma2-9b-it` and `llama-3.3-70b-versatile` were the mandated models for this build. Groq periodically deprecates/renames hosted models — if either model ID returns a `model_decommissioned` error, update `GROQ_PRIMARY_MODEL` / `GROQ_FALLBACK_MODEL` in `.env` to the current equivalents listed at https://console.groq.com/docs/models. No code changes are needed; the client reads these from settings at runtime.

---

## 8. Security Notes

- Passwords are hashed with bcrypt (passlib), never stored or logged in plaintext.
- JWTs are signed with HS256 using `SECRET_KEY` — change this value before any real deployment.
- All mutating actions (create, edit, commit, delete, export) write an `AuditLog` row with the acting user's email and IP.
- File uploads are size-capped (`MAX_UPLOAD_MB`) and stored outside the web root, referenced by path only.

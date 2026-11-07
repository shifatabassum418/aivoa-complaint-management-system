"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-29

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="qa_analyst"),
        sa.Column("is_active", sa.Boolean, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "complaints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("reference_code", sa.String(50), unique=True, index=True),
        sa.Column("complaint_source", sa.String(50)),
        sa.Column("customer_name", sa.String(255)),
        sa.Column("product_name", sa.String(255)),
        sa.Column("product_strength", sa.String(100)),
        sa.Column("batch_number", sa.String(100), index=True),
        sa.Column("manufacturing_date", sa.String(50)),
        sa.Column("expiry_date", sa.String(50)),
        sa.Column("affected_quantity", sa.String(100)),
        sa.Column("originating_site_block", sa.String(255)),
        sa.Column("impacted_npm", sa.String(255)),
        sa.Column("complaint_type", sa.String(100)),
        sa.Column("complaint_date", sa.String(50)),
        sa.Column("complaint_description", sa.Text),
        sa.Column("structured_defect_summary", sa.Text),
        sa.Column("initial_severity", sa.String(50)),
        sa.Column("priority", sa.String(50)),
        sa.Column("risk_severity_suggested", sa.String(50)),
        sa.Column("suggested_next_action", sa.String(255)),
        sa.Column("initial_risk_assessment", sa.Text),
        sa.Column("root_cause_recommendation", sa.Text),
        sa.Column("capa_recommendation", sa.Text),
        sa.Column("ai_summary", sa.Text),
        sa.Column("completeness_score", sa.Float, server_default="0"),
        sa.Column("missing_fields", sa.JSON),
        sa.Column("is_duplicate", sa.Integer, server_default="0"),
        sa.Column("duplicate_of_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("complaints.id"), nullable=True),
        sa.Column("status", sa.String(50), server_default="Pending Triage"),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("committed_at", sa.DateTime, nullable=True),
    )

    op.create_table(
        "complaint_attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("complaint_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("complaints.id")),
        sa.Column("filename", sa.String(500)),
        sa.Column("file_path", sa.String(1000)),
        sa.Column("content_type", sa.String(100)),
        sa.Column("ocr_extracted_text", sa.Text, nullable=True),
        sa.Column("uploaded_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("complaint_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("complaints.id"), nullable=True),
        sa.Column("session_id", sa.String(100), index=True),
        sa.Column("role", sa.String(20)),
        sa.Column("content", sa.Text),
        sa.Column("node_trace", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "timeline_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("complaint_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("complaints.id")),
        sa.Column("event_type", sa.String(100)),
        sa.Column("description", sa.Text),
        sa.Column("actor", sa.String(255)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("user_email", sa.String(255)),
        sa.Column("action", sa.String(100)),
        sa.Column("resource_type", sa.String(100)),
        sa.Column("resource_id", sa.String(100), nullable=True),
        sa.Column("details", sa.JSON, nullable=True),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("timeline_events")
    op.drop_table("chat_messages")
    op.drop_table("complaint_attachments")
    op.drop_table("complaints")
    op.drop_table("users")

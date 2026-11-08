"""
VoiceGuard AI — Integration Service Layer
Phase 29: Integration Layer (SIH26104)

Coordinates data access, tenant boundary enforcement, and integration queries.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.domain import User, Call
from app.modules.integration.models import (
    AnalysisSession,
    ModuleExecution,
    IntegrationEvent,
)
from app.modules.integration.contracts import (
    AnalysisStatus,
    _utcnow,
)
from app.modules.integration.orchestrator import analysis_orchestrator
from app.modules.integration.event_bus import event_bus
from app.core.security_hardening import enforce_tenant_boundary


class IntegrationService:
    """Service layer handling persistence, querying, and tenant isolation for analysis sessions."""

    @staticmethod
    def get_session(db: Session, session_uuid: str, current_user: User) -> AnalysisSession:
        sess = db.query(AnalysisSession).filter(AnalysisSession.session_uuid == session_uuid).first()
        if not sess:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Analysis session '{session_uuid}' not found.")
        enforce_tenant_boundary(current_user, sess.organization_id, "AnalysisSession")
        return sess

    @staticmethod
    def list_sessions(
        db: Session,
        current_user: User,
        status_filter: Optional[str] = None,
        limit: int = 50,
    ) -> List[AnalysisSession]:
        q = db.query(AnalysisSession)
        user_role = getattr(current_user, "role_name", None)
        if not user_role and current_user.role:
            user_role = current_user.role.name
        if user_role not in ["superadmin", "admin"] and current_user.organization_id is not None:
            q = q.filter(
                (AnalysisSession.organization_id == current_user.organization_id)
                | (AnalysisSession.organization_id.is_(None))
            )
        if status_filter:
            q = q.filter(AnalysisSession.status == status_filter)
        return q.order_by(AnalysisSession.created_at.desc()).limit(limit).all()

    @staticmethod
    def cancel_session(db: Session, session_uuid: str, current_user: User) -> Dict[str, Any]:
        sess = IntegrationService.get_session(db, session_uuid, current_user)
        if sess.status in [AnalysisStatus.COMPLETED.value, AnalysisStatus.FAILED.value, AnalysisStatus.CANCELLED.value]:
            return {
                "analysis_id": session_uuid,
                "cancelled": False,
                "status": sess.status,
                "message": f"Session is already in terminal state '{sess.status}' and cannot be cancelled.",
            }

        analysis_orchestrator.cancel_session(session_uuid)
        sess.status = AnalysisStatus.CANCELLED.value
        sess.completed_at = _utcnow()
        db.commit()
        return {
            "analysis_id": session_uuid,
            "cancelled": True,
            "status": AnalysisStatus.CANCELLED.value,
            "message": "Analysis session successfully cancelled.",
        }

    @staticmethod
    def get_events(
        db: Session,
        current_user: User,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        user_role = getattr(current_user, "role_name", None)
        if not user_role and current_user.role:
            user_role = current_user.role.name
        org_id = current_user.organization_id if user_role not in ["superadmin", "admin"] else None

        # Combine persisted DB events with live memory event bus
        db_events = db.query(IntegrationEvent)
        if org_id is not None:
            db_events = db_events.filter(
                (IntegrationEvent.organization_id == org_id) | (IntegrationEvent.organization_id.is_(None))
            )
        db_rows = db_events.order_by(IntegrationEvent.created_at.desc()).limit(limit).all()

        results = []
        for r in db_rows:
            results.append({
                "id": r.id,
                "event_id": r.event_id,
                "event_type": r.event_type,
                "event_version": r.event_version,
                "correlation_id": r.correlation_id,
                "organization_id": r.organization_id,
                "source_module": r.source_module,
                "timestamp": r.created_at,
                "payload_version": r.payload_version,
                "payload": r.payload_json,
            })

        # Append recent live bus events if not already present
        live_events = event_bus.get_history(org_id, limit=limit)
        existing_ids = {item["event_id"] for item in results}
        for le in live_events:
            if le.event_id not in existing_ids:
                results.append({
                    "event_id": le.event_id,
                    "event_type": le.event_type.value if hasattr(le.event_type, "value") else str(le.event_type),
                    "event_version": le.event_version,
                    "correlation_id": le.correlation_id,
                    "organization_id": le.organization_id,
                    "source_module": le.source_module,
                    "timestamp": le.timestamp,
                    "payload_version": le.payload_version,
                    "payload": le.payload,
                })

        return results[:limit]


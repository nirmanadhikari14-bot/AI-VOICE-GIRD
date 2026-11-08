from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, get_current_active_user
from app.models.domain import User, VerificationLog, Call
from app.core.security_hardening import enforce_tenant_boundary

router = APIRouter()

class VerificationRequest(BaseModel):
    call_id: Optional[int] = None
    verification_type: str = "out_of_band_prompt"
    target_identity: str

class VerificationVerify(BaseModel):
    verification_id: int
    decision: str # "confirmed", "failed", "cancelled"
    notes: Optional[str] = None

@router.post("/request")
def request_verification(
    payload: VerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    log = VerificationLog(
        call_id=payload.call_id,
        verification_type=payload.verification_type,
        result="pending",
        confidence=0.0,
        performed_by=current_user.email
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {
        "verification_id": log.id,
        "call_id": log.call_id,
        "verification_type": log.verification_type,
        "status": "pending",
        "instruction": f"A secure prompt has been dispatched to {payload.target_identity}. Confirm presence via verified biometric or trusted device push.",
        "created_at": log.created_at
    }

@router.get("/status/{id}")
def get_verification_status(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    log = db.query(VerificationLog).filter(VerificationLog.id == id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Verification request not found")

    # Enforce tenant isolation: if verification is linked to a call, validate org boundary
    if log.call_id:
        call = db.query(Call).filter(Call.id == log.call_id).first()
        if call:
            enforce_tenant_boundary(current_user, getattr(call, "organization_id", None), "VerificationLog")

    # Non-superadmin users can only view verifications they performed or are org-scoped
    user_role = getattr(current_user, "role_name", None)
    if user_role not in ["superadmin", "admin", "security_analyst", "fraud_investigator"]:
        if log.performed_by and log.performed_by != current_user.email and log.call_id is None:
            raise HTTPException(status_code=403, detail="Access denied to this verification record.")
    return {
        "verification_id": log.id,
        "call_id": log.call_id,
        "verification_type": log.verification_type,
        "result": log.result,
        "confidence": log.confidence,
        "performed_by": log.performed_by,
        "created_at": log.created_at
    }

@router.post("/verify")
def submit_verification(
    payload: VerificationVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    log = db.query(VerificationLog).filter(VerificationLog.id == payload.verification_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Verification request not found")

    # Enforce ownership before allowing mutation
    if log.call_id:
        call = db.query(Call).filter(Call.id == log.call_id).first()
        if call:
            enforce_tenant_boundary(current_user, getattr(call, "organization_id", None), "VerificationLog")
    
    log.result = payload.decision
    log.confidence = 1.0 if payload.decision == "confirmed" else 0.0
    log.performed_by = current_user.email
    db.commit()
    return {
        "verification_id": log.id,
        "result": log.result,
        "confidence": log.confidence,
        "verified_by": current_user.email,
        "updated_at": datetime.utcnow()
    }

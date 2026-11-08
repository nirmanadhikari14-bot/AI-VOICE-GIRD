from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.domain import VoiceProfile, VoiceEmbedding, User
from app.modules.admin.schemas import VoiceProfileAdminResponse
from app.modules.admin.audit_service import log_admin_action

def to_voice_profile_response(vp: VoiceProfile, db: Session) -> VoiceProfileAdminResponse:
    emb_count = db.query(VoiceEmbedding).filter(VoiceEmbedding.voice_profile_id == vp.id).count()
    return VoiceProfileAdminResponse(
        id=vp.id,
        speaker_id=vp.speaker_id,
        profile_name=vp.profile_name,
        baseline_confidence=vp.baseline_confidence,
        embedding_count=emb_count,
        verification_status="enrolled",
        consent_recorded=True,
        created_at=vp.created_at,
        updated_at=vp.updated_at
    )

def list_voice_profiles(db: Session, actor_user: Optional[User] = None) -> List[VoiceProfileAdminResponse]:
    q = db.query(VoiceProfile)
    if actor_user:
        role_name = getattr(actor_user, "role_name", None) or (actor_user.role.name.lower() if actor_user.role else "user")
        if role_name not in ("superadmin", "admin") and actor_user.organization_id is not None:
            q = q.filter(VoiceProfile.organization_id == actor_user.organization_id)
    profiles = q.order_by(VoiceProfile.created_at.desc()).all()
    return [to_voice_profile_response(p, db) for p in profiles]

def revoke_voice_profile(db: Session, profile_id: int, actor_user: User) -> bool:
    vp = db.query(VoiceProfile).filter(VoiceProfile.id == profile_id).first()
    if not vp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Voice profile {profile_id} not found")
        
    # Enforce tenant isolation
    role_name = getattr(actor_user, "role_name", None) or (actor_user.role.name.lower() if actor_user.role else "user")
    if role_name not in ("superadmin", "admin") and actor_user.organization_id is not None:
        if vp.organization_id is not None and vp.organization_id != actor_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="TENANT_ISOLATION_VIOLATION: Cannot revoke voice profile belonging to another organization."
            )

    # Delete associated embeddings first for clean reference
    db.query(VoiceEmbedding).filter(VoiceEmbedding.voice_profile_id == vp.id).delete()
    db.delete(vp)
    db.commit()
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="voice_profile.revoke",
        resource_type="voice_profile",
        resource_id=str(profile_id),
        details={"speaker_id": vp.speaker_id, "profile_name": vp.profile_name}
    )
    return True


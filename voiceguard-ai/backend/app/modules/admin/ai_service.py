from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.domain import ModelServiceConfig, User
from app.modules.admin.schemas import ModelServiceResponse, ModelServiceRollbackRequest
from app.modules.admin.audit_service import log_admin_action

DEFAULT_AI_SERVICES = [
    {
        "service_name": "synthetic_voice_detector",
        "model_identifier": "VoiceGuard-Conformer-VocoderDetector",
        "model_version": "v2.4.1-quant",
        "deployment_status": "deployed",
        "device_target": "cuda:0",
        "latency_p95_ms": 184.2,
        "active": True
    },
    {
        "service_name": "speaker_verification",
        "model_identifier": "ECAPA-TDNN-192d-VoxCeleb",
        "model_version": "v1.8.0",
        "deployment_status": "deployed",
        "device_target": "cuda:0",
        "latency_p95_ms": 142.0,
        "active": True
    },
    {
        "service_name": "prosody_analyzer",
        "model_identifier": "AcousticProsodyPitchJitter-F0",
        "model_version": "v1.2.3",
        "deployment_status": "deployed",
        "device_target": "cpu",
        "latency_p95_ms": 32.5,
        "active": True
    },
    {
        "service_name": "risk_engine",
        "model_identifier": "Phase17-MultiModalWeightedRiskScorer",
        "model_version": "v1.0.0",
        "deployment_status": "deployed",
        "device_target": "cpu",
        "latency_p95_ms": 18.0,
        "active": True
    }
]

def ensure_default_models(db: Session):
    for m in DEFAULT_AI_SERVICES:
        existing = db.query(ModelServiceConfig).filter(ModelServiceConfig.service_name == m["service_name"]).first()
        if not existing:
            config = ModelServiceConfig(**m)
            db.add(config)
    db.commit()

def list_model_services(db: Session) -> List[ModelServiceResponse]:
    ensure_default_models(db)
    models = db.query(ModelServiceConfig).all()
    return [ModelServiceResponse.model_validate(m) for m in models]

def rollback_model_version(
    db: Session,
    service_id: int,
    payload: ModelServiceRollbackRequest,
    actor_user: User
) -> ModelServiceResponse:
    model = db.query(ModelServiceConfig).filter(ModelServiceConfig.id == service_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Model service {service_id} not found")
        
    old_version = model.model_version
    model.model_version = payload.target_version
    db.commit()
    db.refresh(model)
    
    log_admin_action(
        db=db,
        user=actor_user,
        action="ai_model.rollback",
        resource_type="model_service",
        resource_id=str(model.id),
        details={"service_name": model.service_name, "old_version": old_version, "new_version": payload.target_version, "reason": payload.reason}
    )
    return ModelServiceResponse.model_validate(model)


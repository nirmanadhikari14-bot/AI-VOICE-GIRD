from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, get_current_active_user
from app.models.domain import User, DeviceRegistration

router = APIRouter()

class DeviceRegisterPayload(BaseModel):
    device_token: str
    platform: str # "ios" or "android"
    device_name: Optional[str] = "Mobile Device"
    push_enabled: bool = True

@router.post("/register")
def register_device(
    payload: DeviceRegisterPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    # Check if already registered
    dev = db.query(DeviceRegistration).filter(DeviceRegistration.device_token == payload.device_token).first()
    if dev:
        dev.user_id = current_user.id
        dev.platform = payload.platform
        dev.device_name = payload.device_name
        dev.push_enabled = payload.push_enabled
        dev.updated_at = datetime.utcnow()
    else:
        dev = DeviceRegistration(
            user_id=current_user.id,
            device_token=payload.device_token,
            platform=payload.platform,
            device_name=payload.device_name,
            push_enabled=payload.push_enabled
        )
        db.add(dev)
    db.commit()
    db.refresh(dev)
    return {
        "status": "registered",
        "device_id": dev.id,
        "platform": dev.platform,
        "push_enabled": dev.push_enabled,
        "user_id": dev.user_id
    }

@router.delete("/{token}")
def unregister_device(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    dev = db.query(DeviceRegistration).filter(
        DeviceRegistration.device_token == token,
        DeviceRegistration.user_id == current_user.id
    ).first()
    if dev:
        db.delete(dev)
        db.commit()
    return {"status": "unregistered"}

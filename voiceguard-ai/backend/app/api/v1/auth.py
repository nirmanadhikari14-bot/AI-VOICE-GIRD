from datetime import timedelta
from typing import Any, Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core import security
from app.core.config import settings
from app.api.deps import get_db, get_current_active_user, TokenDep
from app.models.domain import User
from app.core.security_hardening import auth_rate_limiter

logger = logging.getLogger(__name__)

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/login", response_model=Token)
def login_access_token(
    request: Request = None,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login with rate-limiting & brute-force defense
    """
    client_ip = request.client.host if (request and getattr(request, "client", None)) else "direct_client"
    lockout_key = f"login_{client_ip}"

    # Check brute-force lockout
    if auth_rate_limiter.is_rate_limited(lockout_key):
        logger.warning(f"Security Alert: Blocked brute force login attempt from {client_ip} for {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Temporarily locked out. Try again in 5 minutes."
        )

    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        auth_rate_limiter.record_failed_attempt(lockout_key, max_failures=5, lockout_seconds=300)
        logger.warning(f"Failed login attempt for user: {form_data.username} from {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif user.status != "active":
        logger.warning(f"Login rejected for suspended user: {form_data.username}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended or inactive")
    
    # Successful login: reset rate limiter for this client
    auth_rate_limiter.reset(lockout_key)
    logger.info(f"Successful authentication for user #{user.id} ({user.email}) from {client_ip}")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current authenticated user identity with organization tenant context.
    """
    role_name = current_user.role.name if current_user.role else "analyst"
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role_id": current_user.role_id,
        "role_name": role_name,
        "organization_id": current_user.organization_id,
        "organization_name": current_user.organization.name if current_user.organization else None,
        "status": current_user.status
    }

@router.post("/logout")
def logout(
    token: TokenDep,
    current_user: User = Depends(get_current_active_user)
):
    """
    Revoke user session and invalidate token.
    """
    security.revoke_token(token)
    logger.info(f"Session terminated / token revoked for user #{current_user.id} ({current_user.email})")
    return {"status": "success", "message": "Session invalidated successfully."}

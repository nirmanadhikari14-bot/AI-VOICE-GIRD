from datetime import datetime, timedelta
from typing import Any, Union, Optional
import threading
import time

import jwt
import bcrypt
from app.core.config import settings

# Thread-safe in-memory token revocation blacklist
_revoked_tokens: dict[str, float] = {}
_revoked_lock = threading.Lock()

def revoke_token(token: str, expires_in_seconds: int = 1800) -> None:
    """Add a JWT token to the revocation blacklist with a TTL."""
    now = time.time()
    with _revoked_lock:
        # Prune expired tokens
        expired_keys = [k for k, exp in _revoked_tokens.items() if exp < now]
        for k in expired_keys:
            del _revoked_tokens[k]
        _revoked_tokens[token] = now + expires_in_seconds

def is_token_revoked(token: str) -> bool:
    """Check if a JWT token has been explicitly revoked."""
    now = time.time()
    with _revoked_lock:
        exp = _revoked_tokens.get(token)
        if exp is None:
            return False
        if exp < now:
            del _revoked_tokens[token]
            return False
        return True

def clear_revoked_tokens() -> None:
    """Reset the revocation blacklist (used for test setup)."""
    with _revoked_lock:
        _revoked_tokens.clear()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

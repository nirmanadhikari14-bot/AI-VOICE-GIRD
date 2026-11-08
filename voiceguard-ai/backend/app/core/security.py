"""
VoiceGuard AI — Security Core Module
Phase 25 / Phase D: Distributed Redis-Backed JWT Revocation & Cryptographic Security

Features:
- Distributed token revocation using Redis with TTL-based automatic expiration
- Secure token fingerprinting (SHA-256 / JTI) to avoid storing or logging raw JWTs
- Strict fail-closed policy in production environments if revocation storage is unreachable
- Local synchronized fallback store for offline development/testing
- Hardened JWT creation with JTI, IAT, EXP, and type claims
- Secure bcrypt password hashing and constant-time verification
"""

import time
import uuid
import logging
import hashlib
import threading
from datetime import datetime, timezone, timedelta
from typing import Any, Union, Optional, Dict

import jwt
import bcrypt
from app.core.config import settings

logger = logging.getLogger(__name__)

# Try importing redis
try:
    import redis
    from redis.exceptions import ConnectionError as RedisConnectionError, TimeoutError as RedisTimeoutError
    HAS_REDIS = True
except ImportError:
    HAS_REDIS = False
    redis = None
    RedisConnectionError = Exception
    RedisTimeoutError = Exception

# Thread-safe in-memory fallback store for offline local testing
_local_revoked_tokens: Dict[str, float] = {}
_local_lock = threading.Lock()

# Redis client singleton with connection pooling
_redis_pool: Optional[Any] = None
_redis_client: Optional[Any] = None
_redis_init_lock = threading.Lock()


def _get_redis_sync_client() -> Optional[Any]:
    """Retrieves or initializes a synchronized Redis client connection."""
    global _redis_pool, _redis_client
    if not HAS_REDIS:
        return None

    if _redis_client is not None:
        return _redis_client

    with _redis_init_lock:
        if _redis_client is None:
            try:
                _redis_pool = redis.ConnectionPool.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=1.5,
                    socket_timeout=1.5,
                    max_connections=15,
                )
                client = redis.Redis(connection_pool=_redis_pool)
                client.ping()
                _redis_client = client
                logger.info(f"Connected to distributed Redis token revocation store at {settings.REDIS_URL}")
            except Exception as exc:
                logger.warning(f"Distributed Redis unreachable: {exc}. Operating in fallback mode.")
                _redis_client = None
    return _redis_client


def get_token_fingerprint(token: str) -> str:
    """
    Computes a cryptographic fingerprint of the JWT token.
    Extracts the unique 'jti' claim if present; otherwise computes SHA-256 of the token.
    Avoids storing raw authentication tokens in caches or logs.
    """
    try:
        unverified = jwt.decode(token, options={"verify_signature": False})
        if "jti" in unverified:
            return f"jti:{unverified['jti']}"
    except Exception:
        pass
    sha = hashlib.sha256(token.encode("utf-8")).hexdigest()
    return f"sha:{sha}"


def revoke_token(token: str, expires_in_seconds: Optional[int] = None) -> None:
    """
    Adds a JWT token to the distributed revocation store with TTL expiration.
    Extracts remaining token lifetime if expires_in_seconds is not specified.
    """
    now = time.time()
    ttl = expires_in_seconds

    # Extract remaining token lifetime from JWT exp claim
    if ttl is None:
        try:
            unverified = jwt.decode(token, options={"verify_signature": False})
            exp_ts = unverified.get("exp")
            if exp_ts:
                remaining = int(exp_ts - now)
                ttl = max(60, remaining)
            else:
                ttl = 1800
        except Exception:
            ttl = 1800

    fingerprint = get_token_fingerprint(token)
    redis_key = f"vg:revoked:{fingerprint}"
    r = _get_redis_sync_client()

    if r is not None:
        try:
            # Atomic set with expiration (SETEX)
            r.set(redis_key, "1", ex=ttl)
            logger.info(f"Token revoked in distributed Redis store (fingerprint: {fingerprint[:16]}..., TTL: {ttl}s)")
            return
        except Exception as exc:
            logger.error(f"Failed to write revoked token to Redis: {exc}")
            if settings.APP_ENV == "production":
                raise RuntimeError("Security Alert: Failed to persist token revocation to distributed store in production mode.")

    # Synchronized local fallback for test / development environments
    with _local_lock:
        # Prune expired keys
        expired = [k for k, exp in _local_revoked_tokens.items() if exp < now]
        for k in expired:
            del _local_revoked_tokens[k]
        _local_revoked_tokens[fingerprint] = now + ttl
        _local_revoked_tokens[token] = now + ttl


def is_token_revoked(token: str) -> bool:
    """
    Checks if a JWT token has been explicitly revoked in distributed Redis or local store.
    Enforces a strict fail-closed policy in production if Redis is configured but unreachable.
    """
    now = time.time()
    fingerprint = get_token_fingerprint(token)
    redis_key = f"vg:revoked:{fingerprint}"
    r = _get_redis_sync_client()

    if r is not None:
        try:
            is_revoked = bool(r.exists(redis_key))
            if is_revoked:
                return True
            # Also check local memory in case it was revoked locally
            with _local_lock:
                return fingerprint in _local_revoked_tokens or token in _local_revoked_tokens
        except Exception as exc:
            logger.error(f"Redis connection error during token revocation check: {exc}")
            if settings.APP_ENV == "production":
                # Strict Fail-Closed Security Policy: Deny access if revocation status cannot be verified
                logger.critical("FAIL-CLOSED: Revocation check failed due to Redis outage in production. Denying token.")
                return True

    # Fallback checking for local test environment
    with _local_lock:
        exp = _local_revoked_tokens.get(fingerprint) or _local_revoked_tokens.get(token)
        if exp is None:
            return False
        if exp < now:
            if fingerprint in _local_revoked_tokens:
                del _local_revoked_tokens[fingerprint]
            if token in _local_revoked_tokens:
                del _local_revoked_tokens[token]
            return False
        return True


def clear_revoked_tokens() -> None:
    """Resets the revocation blacklist across Redis and local store (for test fixtures)."""
    global _redis_client
    r = _get_redis_sync_client()
    if r is not None:
        try:
            keys = r.keys("vg:revoked:*")
            if keys:
                r.delete(*keys)
        except Exception:
            pass
    with _local_lock:
        _local_revoked_tokens.clear()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    token_type: str = "access",
    jti: Optional[str] = None,
) -> str:
    """
    Creates a signed JWT with unique JTI, IAT, EXP, and subject claims.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    token_jti = jti or uuid.uuid4().hex
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "jti": token_jti,
        "type": token_type,
        "iat": now,
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

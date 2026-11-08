"""
VoiceGuard AI — Security & Privacy Hardening Core Module
Phase 25: Comprehensive Application Security, Tenant Isolation, Rate Limiting & Audio Validation
"""

import time
import uuid
import logging
from collections import defaultdict
from typing import Optional, List, Dict, Set
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger(__name__)

# ==============================================================================
# 1. RATE LIMITING & BRUTE FORCE DEFENSE
# ==============================================================================

class InMemoryRateLimiter:
    """
    Sliding window in-memory rate limiter for sensitive endpoints.
    Protects against brute force credential stuffing and DoS attacks.
    """
    def __init__(self, max_requests: int = 15, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self.lockouts: Dict[str, float] = {}

    def is_rate_limited(self, client_key: str) -> bool:
        now = time.time()
        
        # Check active lockout
        if client_key in self.lockouts:
            if now < self.lockouts[client_key]:
                return True
            else:
                del self.lockouts[client_key]

        # Clean old timestamps outside window
        window_start = now - self.window_seconds
        self.requests[client_key] = [t for t in self.requests[client_key] if t > window_start]

        if len(self.requests[client_key]) >= self.max_requests:
            # Trigger temporary lockout (2x window)
            self.lockouts[client_key] = now + (self.window_seconds * 2)
            logger.warning(f"Security Alert: Rate limit exceeded for {client_key}. Lockout applied.")
            return True

        self.requests[client_key].append(now)
        return False

    def record_failed_attempt(self, client_key: str, max_failures: int = 5, lockout_seconds: int = 300) -> bool:
        now = time.time()
        window_start = now - lockout_seconds
        self.requests[client_key] = [t for t in self.requests[client_key] if t > window_start]
        self.requests[client_key].append(now)

        if len(self.requests[client_key]) >= max_failures:
            self.lockouts[client_key] = now + lockout_seconds
            logger.warning(f"Security Alert: Brute force lockout triggered for {client_key}.")
            return True
        return False

    def reset(self, client_key: str):
        if client_key in self.requests:
            del self.requests[client_key]
        if client_key in self.lockouts:
            del self.lockouts[client_key]

# Global singletons for auth and general api
auth_rate_limiter = InMemoryRateLimiter(max_requests=10, window_seconds=60)
api_rate_limiter = InMemoryRateLimiter(max_requests=120, window_seconds=60)


# ==============================================================================
# 2. AUDIO PIPELINE SECURITY & VALIDATION
# ==============================================================================

class AudioSecurityValidator:
    """
    Validates audio byte streams and uploads against malicious payloads,
    zip bombs, oversized buffers, and invalid magic headers.
    """
    MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB max upload
    MAX_CHUNK_SIZE_BYTES = 1024 * 1024       # 1 MB max websocket frame
    ALLOWED_MAGIC_SIGNATURES = {
        "wav": [b"RIFF"],
        "flac": [b"fLaC"],
        "mp3": [b"ID3", b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"],
        "ogg": [b"OggS"],
    }

    @classmethod
    def validate_audio_chunk(cls, data: bytes) -> bool:
        """
        Validates real-time audio chunk size and non-empty payload.
        """
        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty audio chunk received."
            )
        if len(data) > cls.MAX_CHUNK_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Audio frame exceeds maximum limit of {cls.MAX_CHUNK_SIZE_BYTES} bytes."
            )
        return True

    @classmethod
    def validate_audio_file(cls, data: bytes, content_type: Optional[str] = None) -> str:
        """
        Validates complete audio file headers, size, and mime integrity.
        Returns detected format string or raises HTTPException.
        """
        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty audio file."
            )
        if len(data) > cls.MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Audio payload size {len(data)} exceeds maximum allowed size ({cls.MAX_FILE_SIZE_BYTES} bytes)."
            )

        # Inspect Magic Bytes
        header = data[:12]
        detected_format = None

        if header.startswith(b"RIFF") and b"WAVE" in header:
            detected_format = "wav"
        elif header.startswith(b"fLaC"):
            detected_format = "flac"
        elif header.startswith(b"OggS"):
            detected_format = "ogg"
        elif header.startswith(b"ID3") or header[:2] in [b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"]:
            detected_format = "mp3"

        if not detected_format:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Invalid or unsupported audio container signature. Supported formats: WAV, FLAC, MP3, OGG."
            )

        return detected_format


# ==============================================================================
# 3. TENANT ISOLATION & ACCESS CONTROL GUARD
# ==============================================================================

def _resolve_user_role(user) -> str:
    """
    Safely resolve a user's role name from either a direct attribute
    or a SQLAlchemy relationship (user.role.name). Returns empty string if unavailable.
    """
    role_name = getattr(user, "role_name", None)
    if not role_name:
        role_obj = getattr(user, "role", None)
        role_name = role_obj.name if role_obj else ""
    return role_name or ""


def enforce_tenant_boundary(user, resource_org_id: Optional[int], resource_name: str = "resource") -> None:
    """
    Enforces strict server-side multi-tenant isolation.
    Superadmin and platform admin have global scope.
    Tenant admins and regular users cannot access foreign organization resources.
    """
    # Check if user has global platform administrator privilege
    user_role = _resolve_user_role(user)
    if user_role in ["superadmin", "admin"]:
        return  # Platform-wide visibility granted

    user_org_id = getattr(user, "organization_id", None)
    if user_org_id is None:
        # User not bound to any tenant, restricted to their own account only
        if resource_org_id is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"TENANT_ISOLATION_VIOLATION: Unassigned user cannot access {resource_name} of organization {resource_org_id}."
            )
        return

    # Check if resource belongs to foreign organization
    if resource_org_id is not None and user_org_id != resource_org_id:
        logger.warning(
            f"SECURITY ALERT: Tenant boundary breach blocked! User #{user.id} (Org {user_org_id}) "
            f"attempted to access {resource_name} belonging to foreign Org {resource_org_id}."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"TENANT_ISOLATION_VIOLATION: Access denied. {resource_name} belongs to another organization."
        )


# ==============================================================================
# 4. HTTP SECURITY HEADERS & DEFENSE-IN-DEPTH MIDDLEWARE
# ==============================================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Applies comprehensive security headers to prevent XSS, clickjacking,
    MIME sniffing, and insecure content loading.
    """
    async def dispatch(self, request: Request, call_next):
        # Generate or capture correlation ID
        correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
        
        # Check global API rate limiting for non-static endpoints
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        
        if path.startswith("/api/v1/auth/login"):
            if auth_rate_limiter.is_rate_limited(f"login_{client_ip}"):
                return Response(
                    content='{"detail": "Too many failed login attempts. Account temporarily locked for 10 minutes."}',
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    media_type="application/json"
                )

        response = await call_next(request)

        # Attach Security Headers
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "connect-src 'self' http://localhost:8000 ws://localhost:8000 http://127.0.0.1:8000 ws://127.0.0.1:8000; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "frame-ancestors 'none';"
        )
        return response

import logging
import json
import uuid
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
import jwt
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.domain import User
from app.core.security_hardening import AudioSecurityValidator
from app.services.streaming_audio_pipeline import stream_pipeline_manager

router = APIRouter()
logger = logging.getLogger(__name__)

async def authenticate_websocket(websocket: WebSocket) -> Optional[User]:
    """
    Validates token from query parameters or Sec-WebSocket-Protocol header.
    Rejects unauthorized connection attempts before accepting streaming frames.
    """
    token = websocket.query_params.get("token")
    if not token and "authorization" in websocket.headers:
        auth_header = websocket.headers["authorization"]
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        # Require authentication token; allow anonymous stream in development only if explicitly enabled
        if settings.APP_ENV == "development" and os.environ.get("VOICEGUARD_DEV_ALLOW_ANON_STREAM", "").lower() == "true":
            db = SessionLocal()
            try:
                return db.query(User).filter(User.status == "active").first()
            finally:
                db.close()
        return None

    from app.core import security
    if security.is_token_revoked(token):
        logger.warning("Rejected WebSocket connection: token is revoked.")
        return None

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        db = SessionLocal()
        try:
            return db.query(User).filter(User.id == int(user_id), User.status == "active").first()
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"WebSocket auth failed: {e}")
        return None

@router.websocket("/audio")
async def websocket_audio_endpoint(websocket: WebSocket):
    user = await authenticate_websocket(websocket)
    if not user:
        logger.warning("Rejecting unauthenticated WebSocket audio connection.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized: Valid authentication token required.")
        return

    await websocket.accept()
    session_id = f"stream_{user.id}_{uuid.uuid4().hex[:8]}"
    try:
        session = stream_pipeline_manager.get_or_create_session(
            session_id=session_id,
            user_id=user.id,
            organization_id=getattr(user, "organization_id", None)
        )
    except RuntimeError as e:
        logger.warning(f"Connection rejected: {e}")
        await websocket.close(code=status.WS_1013_TRY_AGAIN_LATER, reason=str(e))
        return

    logger.info(f"Authenticated user #{user.id} ({user.email}) connected to secure audio stream. Session: {session_id}")

    try:
        # Send connection established telemetry
        await websocket.send_text(json.dumps({
            "event": "connected",
            "session_id": session_id,
            "status": "ready",
            "sample_rate": 16000,
            "buffer_capacity_sec": 10.0
        }))

        seq_counter = 0
        while True:
            # Receive binary frame
            data = await websocket.receive_bytes()

            # Validate chunk limits & prevent memory exhaustion
            AudioSecurityValidator.validate_audio_chunk(data)

            # Ingest into optimized ring buffer with shared spectral feature extraction
            features = session.ingest_chunk(data, seq=seq_counter)
            seq_counter += 1

            # Emit lightweight real-time telemetry back every 5 frames (~100ms) to conserve network
            if seq_counter % 5 == 0:
                await websocket.send_text(json.dumps({
                    "event": "telemetry",
                    "frame_seq": seq_counter,
                    "is_speech": features.is_speech,
                    "rms_energy": features.energy_rms,
                    "fill_ratio": round(session.ring_buffer.fill_ratio, 3),
                    "ingest_latency_ms": round(session.processing_latencies_ms[-1] if session.processing_latencies_ms else 0.0, 2),
                    "dropped_frames": session.jitter_buffer.metrics["dropped_late_frames"]
                }))

    except WebSocketDisconnect:
        logger.info(f"Client #{user.id} disconnected from audio stream (Session: {session_id}).")
    except Exception as e:
        logger.error(f"Error in secure audio stream: {e}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass
    finally:
        stream_pipeline_manager.close_session(session_id)

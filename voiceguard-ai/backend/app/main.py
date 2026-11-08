import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.health import router as health_router
from app.core.database import engine
from app.models.domain import Base

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

import os
from app.core.security_hardening import SecurityHeadersMiddleware

app = FastAPI(
    title="VoiceGuard AI",
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# Attach Security Headers & Rate Limiting Middleware
app.add_middleware(SecurityHeadersMiddleware)

# Configure CORS with strict explicit origins (replaces insecure wildcard)
env_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
trusted_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8081",
    "tauri://localhost",
    "http://tauri.localhost",
] + env_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=trusted_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Correlation-ID", "Content-Disposition"]
)

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing database with security hardening schema migrations...")
    import app.modules.multilingual.models  # Register multilingual tables with Base
    import app.modules.evaluation.models    # Register evaluation tables with Base
    import app.modules.integration.models   # Register Phase 29 integration tables with Base
    from sqlalchemy import text
    with engine.connect() as conn:
        for tbl in ["users", "calls", "alerts", "incidents", "prevention_actions", "voice_profiles", "device_registrations"]:
            try:
                conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN organization_id INTEGER REFERENCES organizations(id)"))
                conn.commit()
            except Exception:
                pass
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized.")

    # Phase 28: Warm up AI inference memory pools to eliminate cold-start spikes
    try:
        from app.services.inference_worker_pool import inference_worker_pool
        from app.modules.evaluation.service import get_adapter
        warmup_dict = {}
        for m_id in ["conformer_vocoder", "ecapa_tdnn"]:
            try:
                adp = get_adapter(m_id)
                if adp:
                    warmup_dict[m_id] = adp
            except Exception:
                pass
        inference_worker_pool.warmup_models(warmup_dict)
    except Exception as e:
        logger.warning(f"Inference warmup notice: {e}")

# Include versioned API routers
app.include_router(health_router, prefix="/api/v1", tags=["system"])

from app.api.v1.auth import router as auth_router
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])

from app.api.v1.risk import router as risk_router
app.include_router(risk_router, prefix="/api/v1/risk", tags=["risk"])

from app.api.v1.alerts import router as alerts_router
app.include_router(alerts_router, prefix="/api/v1/alerts", tags=["alerts"])

from app.api.v1.incidents import router as incidents_router
app.include_router(incidents_router, prefix="/api/v1/incidents", tags=["incidents"])

from app.api.v1.prevention import router as prevention_router
app.include_router(prevention_router, prefix="/api/v1/prevention", tags=["prevention"])

from app.api.v1.verification import router as verification_router
app.include_router(verification_router, prefix="/api/v1/verification", tags=["verification"])

from app.api.v1.devices import router as devices_router
app.include_router(devices_router, prefix="/api/v1/devices", tags=["devices"])

from app.api.v1.reports import router as reports_router
app.include_router(reports_router, prefix="/api/v1/reports", tags=["reports"])

from app.api.v1.calls import router as calls_router
app.include_router(calls_router, prefix="/api/v1/calls", tags=["calls"])

from app.api.v1.threats import router as threats_router
app.include_router(threats_router, prefix="/api/v1/threats", tags=["threats"])

from app.api.v1.audit import router as audit_router
app.include_router(audit_router, prefix="/api/v1/audit", tags=["audit"])

from app.api.v1.system import router as system_router
app.include_router(system_router, prefix="/api/v1/system", tags=["system"])

from app.api.v1.search import router as search_router
app.include_router(search_router, prefix="/api/v1/search", tags=["search"])

from app.api.v1.stream import router as stream_router
app.include_router(stream_router, prefix="/ws/v1", tags=["stream"])

from app.modules.admin.router import router as admin_router
app.include_router(admin_router, prefix="/api/v1/admin", tags=["admin"])

from app.modules.multilingual.router import router as multilingual_router
app.include_router(multilingual_router, prefix="/api/v1/multilingual", tags=["multilingual"])

from app.modules.evaluation.router import router as evaluation_router
app.include_router(evaluation_router, prefix="/api/v1/evaluations", tags=["evaluation"])

from app.modules.integration.router import router as integration_router
app.include_router(integration_router, prefix="/api/v1/analysis", tags=["analysis", "integration"])




# WebSocket Test Endpoint (Restricted in production for attack surface reduction)
@app.websocket("/ws/v1/test")
async def websocket_test(websocket: WebSocket):
    from app.core.config import settings
    if settings.APP_ENV == "production":
        await websocket.close(code=1008, reason="Test endpoint disabled in production.")
        return
    await websocket.accept()
    logger.info("WebSocket connection established on /ws/v1/test")
    try:
        while True:
            data = await websocket.receive_text()
            if len(data) > 65536:
                await websocket.send_text("Payload exceeds maximum test limit of 64KB.")
                continue
            logger.info(f"Received WebSocket test message ({len(data)} bytes)")
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        logger.info("WebSocket connection closed cleanly on /ws/v1/test")

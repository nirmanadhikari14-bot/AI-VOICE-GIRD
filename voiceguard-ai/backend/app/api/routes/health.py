from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/health")
def health_check():
    return JSONResponse(content={"status": "healthy"})

@router.get("/status")
def status_check():
    return JSONResponse(content={
        "application": "VoiceGuard AI",
        "environment": "development",
        "version": "0.1.0"
    })

# Note: WebSocket endpoint needs to be mounted without the APIRouter prefix if we want it at /ws/v1/test
# Or we can put it in a separate APIRouter. We'll define it here and mount it correctly in main.py.

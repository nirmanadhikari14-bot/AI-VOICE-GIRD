# =============================================================================
# VoiceGuard AI — Production Backend Dockerfile (Multi-Stage)
# Phase 30: Dockerization (SIH26104)
# =============================================================================

# ── Stage 1: Build & Dependency Compilation ──────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install compilation toolchain & development headers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsndfile1-dev \
    libportaudio2 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python wheels into isolated target
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt && \
    pip install --no-cache-dir --prefix=/install psutil redis numpy scipy psycopg2-binary asyncpg

# ── Stage 2: Minimal Secure Runtime ──────────────────────────────────────────
FROM python:3.11-slim AS runtime

LABEL maintainer="VoiceGuard AI Team <devops@voiceguard.ai>"
LABEL description="VoiceGuard AI Real-Time Voice Cloning Detection Platform Backend"
LABEL version="1.0.0"

# Install runtime shared libraries only (no compiler tools in runtime image)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    libportaudio2 \
    libgomp1 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-compiled dependencies from builder stage
COPY --from=builder /install /usr/local

WORKDIR /app

# Create non-root system user & group (least privilege)
RUN groupadd -g 1001 voiceguard && \
    useradd -u 1001 -g voiceguard -s /bin/bash -m voiceguard

# Create persistent model cache and scratch storage directories
RUN mkdir -p /app/models /app/storage/audio /app/storage/temp /app/logs && \
    chown -R voiceguard:voiceguard /app

# Copy application components (including ai-engine dependencies)
COPY --chown=voiceguard:voiceguard ai-engine/ /app/ai-engine/
COPY --chown=voiceguard:voiceguard backend/ /app/backend/

WORKDIR /app/backend

# Configure module resolution & environment defaults
ENV PYTHONPATH="/app/backend:/app/ai-engine" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production \
    MODEL_CACHE_DIR=/app/models \
    AUDIO_STORAGE_PATH=/app/storage/audio \
    TEMP_STORAGE_PATH=/app/storage/temp

# Switch to non-root user
USER voiceguard

# Graceful shutdown signal for Uvicorn
STOPSIGNAL SIGTERM

# Container health monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

EXPOSE 8000

# Safe entrypoint: runs migrations then starts Uvicorn
CMD ["sh", "-c", "python run_migrations.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --log-level warning"]


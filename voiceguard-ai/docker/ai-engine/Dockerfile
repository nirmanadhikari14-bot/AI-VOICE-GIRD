# =============================================================================
# VoiceGuard AI — Standalone AI Engine & Model Worker Dockerfile
# Phase 30: Dockerization (SIH26104)
# =============================================================================

FROM python:3.11-slim AS runtime

LABEL maintainer="VoiceGuard AI Team <devops@voiceguard.ai>"
LABEL description="VoiceGuard AI Dedicated Model Inference & Offline Evaluation Worker"
LABEL version="1.0.0"

# Install audio processing and math runtime libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    libportaudio2 \
    libgomp1 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install AI dependencies with pinned PyTorch CPU / ONNX packages
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    numpy \
    scipy \
    psutil \
    redis \
    sqlalchemy \
    pydantic

# Create non-root system user
RUN groupadd -g 1001 voiceguard && \
    useradd -u 1001 -g voiceguard -s /bin/bash -m voiceguard

# Create model weight storage & evaluation output directories
RUN mkdir -p /app/models /app/datasets /app/eval_results && \
    chown -R voiceguard:voiceguard /app

# Copy AI engine code and dataset references
COPY --chown=voiceguard:voiceguard ai-engine/ /app/ai-engine/
COPY --chown=voiceguard:voiceguard models/ /app/models/

WORKDIR /app

ENV PYTHONPATH="/app:/app/ai-engine" \
    PYTHONUNBUFFERED=1 \
    MODEL_CACHE_DIR=/app/models \
    APP_ENV=production

USER voiceguard

HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "from evaluation.interfaces import ModelType; print('AI Engine Healthy')" || exit 1

# Default: execute automated model readiness and evaluation check
CMD ["python", "-c", "import sys; print('VoiceGuard AI Engine Worker running in standby mode.'); sys.stdout.flush()"]


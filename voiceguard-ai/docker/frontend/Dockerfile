# =============================================================================
# VoiceGuard AI — Production Frontend Dockerfile (Multi-Stage)
# Phase 30: Dockerization (SIH26104)
# =============================================================================

# ── Stage 1: Build & Bundle Optimization ─────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests for layer caching
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy full frontend source code
COPY frontend/ ./

# Compile TypeScript and build production assets with Vite
RUN npm run build

# ── Stage 2: Hardened Nginx Production Runtime ───────────────────────────────
FROM nginx:1.25-alpine AS runtime

LABEL maintainer="VoiceGuard AI Team <devops@voiceguard.ai>"
LABEL description="VoiceGuard AI Web Dashboard & Enterprise Admin Portal"
LABEL version="1.0.0"

# Remove default nginx static welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built production assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration (SPA routing, WebSocket proxying, security headers, rate limiting)
COPY nginx/voiceguard.conf /etc/nginx/conf.d/default.conf

# Configure directory permissions and pid file for unprivileged nginx operation
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /usr/share/nginx/html /etc/nginx/conf.d

# Run as non-root user
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

EXPOSE 80

STOPSIGNAL SIGQUIT

CMD ["nginx", "-g", "daemon off;"]

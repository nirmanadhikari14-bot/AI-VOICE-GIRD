#!/bin/bash
# =============================================================================
# VoiceGuard AI — Server Bootstrap Script
# Phase 32: Production Infrastructure
#
# Run this once on a fresh Ubuntu 22.04 LTS server to prepare for deployment.
# Tested on: Ubuntu 22.04 LTS, x86-64
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/.../bootstrap_server.sh | bash
#   OR: scp and run locally: bash bootstrap_server.sh
# =============================================================================

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="${APP_DIR:-/opt/voiceguard}"
DATA_DIR="${DATA_DIR:-/opt/voiceguard/data}"

echo "============================================================"
echo " VoiceGuard AI — Server Bootstrap"
echo " User: ${DEPLOY_USER}"
echo " App dir: ${APP_DIR}"
echo "============================================================"

# ── 1. System update ──────────────────────────────────────────────────────
echo "[1/9] Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget git unzip \
    ca-certificates gnupg lsb-release \
    ufw fail2ban \
    jq htop ncdu \
    libsndfile1 ffmpeg

# ── 2. Install Docker ─────────────────────────────────────────────────────
echo "[2/9] Installing Docker..."
if ! command -v docker &>/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
        gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "[OK] Docker installed: $(docker --version)"
else
    echo "[SKIP] Docker already installed: $(docker --version)"
fi

# ── 3. Create deploy user ─────────────────────────────────────────────────
echo "[3/9] Creating deploy user '${DEPLOY_USER}'..."
if ! id "${DEPLOY_USER}" &>/dev/null; then
    useradd -m -s /bin/bash "${DEPLOY_USER}"
    usermod -aG docker "${DEPLOY_USER}"
    echo "[OK] User ${DEPLOY_USER} created and added to docker group."
else
    echo "[SKIP] User ${DEPLOY_USER} already exists."
    usermod -aG docker "${DEPLOY_USER}" 2>/dev/null || true
fi

# ── 4. Create directory structure ─────────────────────────────────────────
echo "[4/9] Creating application directories..."
mkdir -p \
    "${APP_DIR}" \
    "${DATA_DIR}/postgres" \
    "${DATA_DIR}/redis" \
    "${DATA_DIR}/prometheus" \
    "${DATA_DIR}/grafana" \
    "${APP_DIR}/backups/postgres" \
    "${APP_DIR}/models" \
    "${APP_DIR}/audio" \
    "${APP_DIR}/logs"

# Set ownership
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"

# Grafana requires UID 472
chown -R 472:472 "${DATA_DIR}/grafana"

# Prometheus requires UID 65534
chown -R 65534:65534 "${DATA_DIR}/prometheus"

echo "[OK] Directories created."

# ── 5. Configure UFW firewall ─────────────────────────────────────────────
echo "[5/9] Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment "SSH"
ufw allow 80/tcp    comment "HTTP (ACME challenge + redirect)"
ufw allow 443/tcp   comment "HTTPS"
# IMPORTANT: Do NOT open 5432, 6379, 8000, 3000, 9090 — internal only
ufw --force enable
echo "[OK] UFW configured. Status:"
ufw status numbered

# ── 6. Configure fail2ban ─────────────────────────────────────────────────
echo "[6/9] Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port    = ssh
logpath = %(sshd_log)s
backend = %(syslog_backend)s
EOF
systemctl enable fail2ban
systemctl restart fail2ban
echo "[OK] fail2ban configured."

# ── 7. Configure automatic security updates ───────────────────────────────
echo "[7/9] Configuring unattended security upgrades..."
apt-get install -y -qq unattended-upgrades
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::Automatic-Reboot "false";
EOF
echo "[OK] Automatic security updates configured."

# ── 8. Configure log rotation ─────────────────────────────────────────────
echo "[8/9] Configuring Docker log rotation..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "50m",
        "max-file": "5"
    },
    "live-restore": true
}
EOF
systemctl reload docker
echo "[OK] Docker log rotation configured."

# ── 9. Set up backup cron ─────────────────────────────────────────────────
echo "[9/9] Setting up daily backup cron..."
CRON_LINE="0 2 * * * cd ${APP_DIR} && docker compose --profile backup run --rm db-backup >> ${APP_DIR}/logs/backup.log 2>&1"
(crontab -l -u "${DEPLOY_USER}" 2>/dev/null | grep -v "db-backup" || true; echo "${CRON_LINE}") \
    | crontab -u "${DEPLOY_USER}" -
echo "[OK] Daily backup cron added (02:00 UTC)."

echo ""
echo "============================================================"
echo " Bootstrap complete."
echo "============================================================"
echo ""
echo " NEXT STEPS:"
echo "   1. Copy SSH public key to ${DEPLOY_USER}:"
echo "      ssh-copy-id -i ~/.ssh/id_ed25519.pub ${DEPLOY_USER}@$(hostname -I | awk '{print $1}')"
echo "   2. Copy .env.production to ${APP_DIR}/.env"
echo "   3. Copy docker-compose files to ${APP_DIR}/"
echo "   4. Run: cd ${APP_DIR} && docker compose -f docker-compose.infrastructure.yml pull"
echo "   5. Obtain TLS certificate: docker compose run --rm certbot"
echo "   6. Start: docker compose -f docker-compose.infrastructure.yml up -d"
echo ""
echo " Server IP: $(hostname -I | awk '{print $1}')"
echo " Deploy user: ${DEPLOY_USER}"
echo " App directory: ${APP_DIR}"


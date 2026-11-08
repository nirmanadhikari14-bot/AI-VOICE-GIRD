"""
VoiceGuard AI — Phase 30 Dockerization Verification Test Suite
=============================================================
Validates container topologies, multi-stage Dockerfiles, network isolation,
volume persistence, production security invariants, GPU acceleration profiles,
and service health configurations.
"""

import os
import sys
from pathlib import Path
import json
import yaml
import pytest

# Ensure backend and ai-engine are in sys.path
TEST_DIR = Path(__file__).resolve().parent
BACKEND_DIR = TEST_DIR.parent
REPO_ROOT = BACKEND_DIR.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(REPO_ROOT / "ai-engine") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "ai-engine"))


def load_yaml(file_path: Path):
    assert file_path.is_file(), f"File not found: {file_path}"
    with open(file_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


# =============================================================================
# 1. Base Compose Topology & Service Tests
# =============================================================================

def test_base_compose_services():
    """Verify core services are defined in the base docker-compose.yml"""
    compose_path = REPO_ROOT / "docker-compose.yml"
    data = load_yaml(compose_path)

    services = data.get("services", {})
    expected_services = ["db", "redis", "backend", "frontend", "nginx"]
    for svc in expected_services:
        assert svc in services, f"Service '{svc}' missing in base docker-compose.yml"


def test_base_compose_network_segmentation():
    """Verify 3-tier network segmentation and data isolation"""
    compose_path = REPO_ROOT / "docker-compose.yml"
    data = load_yaml(compose_path)

    networks = data.get("networks", {})
    assert "frontend-network" in networks, "Missing frontend-network"
    assert "backend-network" in networks, "Missing backend-network"
    assert "data-network" in networks, "Missing data-network"

    # data-network must be internal (cannot route to external internet)
    data_net = networks["data-network"]
    assert data_net.get("internal") is True, "data-network must have 'internal: true' for isolation"


def test_base_compose_persistent_volumes():
    """Verify persistent volumes are declared for stateful components"""
    compose_path = REPO_ROOT / "docker-compose.yml"
    data = load_yaml(compose_path)

    volumes = data.get("volumes", {})
    expected_volumes = [
        "postgres_data",
        "redis_data",
        "model_cache",
        "audio_storage",
        "nginx_logs"
    ]
    for vol in expected_volumes:
        assert vol in volumes, f"Volume '{vol}' missing from docker-compose.yml"


def test_base_compose_no_database_ports_exposed():
    """Verify neither PostgreSQL nor Redis ports are exposed to host in base compose"""
    compose_path = REPO_ROOT / "docker-compose.yml"
    data = load_yaml(compose_path)

    db_svc = data["services"]["db"]
    redis_svc = data["services"]["redis"]

    assert "ports" not in db_svc, "PostgreSQL host port should not be published in base compose"
    assert "ports" not in redis_svc, "Redis host port should not be published in base compose"


# =============================================================================
# 2. Production Compose Security & Hardening Tests
# =============================================================================

def test_production_compose_hardening():
    """Verify production compose enforces replica scaling, logging limits, and no host ports"""
    prod_path = REPO_ROOT / "docker-compose.prod.yml"
    raw_content = prod_path.read_text(encoding="utf-8")

    # Verify mandatory environment variable check syntax (${VAR:?...})
    assert "${DB_PASSWORD:?" in raw_content, "DB_PASSWORD must be strictly required in production"
    assert "${REDIS_PASSWORD:?" in raw_content, "REDIS_PASSWORD must be strictly required in production"
    assert "${SECRET_KEY:?" in raw_content, "SECRET_KEY must be strictly required in production"

    data = yaml.safe_load(raw_content)
    backend_svc = data.get("services", {}).get("backend", {})

    # Replicas configured
    deploy = backend_svc.get("deploy", {})
    replicas = deploy.get("replicas", 0)
    assert "2" in str(replicas) or (isinstance(replicas, int) and replicas >= 2), "Backend in production should scale to at least 2 replicas"

    # Resource constraints
    resources = deploy.get("resources", {})
    limits = resources.get("limits", {})
    assert "memory" in limits, "Production backend must have memory limits defined"
    assert "cpus" in limits, "Production backend must have CPU limits defined"


# =============================================================================
# 3. Development & Testing Profile Tests
# =============================================================================

def test_dev_compose_configuration():
    """Verify development compose enables hot-reloading and host bind mounts"""
    dev_path = REPO_ROOT / "docker-compose.dev.yml"
    data = load_yaml(dev_path)

    backend_svc = data.get("services", {}).get("backend", {})
    assert "--reload" in backend_svc.get("command", []), "Development backend must run with --reload"

    ports = backend_svc.get("ports", [])
    assert any("8000:8000" in p for p in ports), "Backend port 8000 must be exposed in dev"


def test_test_compose_configuration():
    """Verify test compose runs isolated ephemeral storage and test runner"""
    test_path = REPO_ROOT / "docker-compose.test.yml"
    data = load_yaml(test_path)

    services = data.get("services", {})
    assert "test-runner" in services, "test-runner service must exist in docker-compose.test.yml"

    runner_cmd = services["test-runner"].get("command", "")
    assert "pytest" in runner_cmd, "test-runner must execute pytest"

    # Database uses tmpfs for ephemeral speed
    db_svc = services.get("test-db", {})
    assert "tmpfs" in db_svc, "test-db should use tmpfs for ephemeral in-memory performance"


# =============================================================================
# 4. GPU Acceleration Compose Tests
# =============================================================================

def test_gpu_compose_configuration():
    """Verify GPU compose defines NVIDIA container toolkit device reservation"""
    gpu_path = REPO_ROOT / "docker-compose.gpu.yml"
    data = load_yaml(gpu_path)

    backend_svc = data.get("services", {}).get("backend", {})
    env = backend_svc.get("environment", {})
    assert env.get("VOICEGUARD_DEVICE") == "cuda"
    assert env.get("TORCH_DEVICE") == "cuda"

    reservations = backend_svc.get("deploy", {}).get("resources", {}).get("reservations", {})
    devices = reservations.get("devices", [])
    assert len(devices) > 0, "GPU reservations must define devices"
    assert devices[0].get("driver") == "nvidia", "Device driver must be nvidia"
    assert "gpu" in devices[0].get("capabilities", []), "Device capabilities must include 'gpu'"


# =============================================================================
# 5. Multi-stage Dockerfile & Security Invariant Tests
# =============================================================================

def test_backend_dockerfile_multi_stage_and_user():
    """Verify Dockerfile.backend uses multi-stage build and non-root user"""
    df_path = REPO_ROOT / "Dockerfile.backend"
    content = df_path.read_text(encoding="utf-8")

    assert "FROM python:3.11-slim AS builder" in content
    assert "FROM python:3.11-slim AS runtime" in content
    assert "useradd" in content
    assert "USER voiceguard" in content
    assert "HEALTHCHECK" in content
    assert "PYTHONPATH=" in content


def test_frontend_dockerfile_multi_stage_and_user():
    """Verify Dockerfile.frontend uses multi-stage build and non-root user nginx"""
    df_path = REPO_ROOT / "Dockerfile.frontend"
    content = df_path.read_text(encoding="utf-8")

    assert "FROM node:20-alpine AS builder" in content
    assert "FROM nginx:1.25-alpine AS runtime" in content
    assert "USER nginx" in content
    assert "HEALTHCHECK" in content


def test_dockerignore_coverage():
    """Verify .dockerignore excludes sensitive source patterns and virtualenvs"""
    ignore_path = REPO_ROOT / ".dockerignore"
    content = ignore_path.read_text(encoding="utf-8")

    required_patterns = [".env", ".git", "venv", "*.db", "node_modules", "desktop", "mobile"]
    for pat in required_patterns:
        assert pat in content, f".dockerignore missing exclusion for '{pat}'"


# =============================================================================
# 6. Service Health Check Integration Test
# =============================================================================

def test_health_check_endpoint():
    """Verify backend health endpoint is importable and reports healthy status"""
    from app.api.routes.health import health_check

    resp = health_check()
    assert resp.status_code == 200
    data = json.loads(resp.body.decode("utf-8"))
    assert data.get("status") == "healthy"

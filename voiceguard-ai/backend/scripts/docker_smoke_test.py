#!/usr/bin/env python3
"""
VoiceGuard AI — Dockerization Smoke Test Suite (Phase 30)
========================================================
Validates all Dockerfiles, Docker Compose configurations, network security policies,
volume definitions, environment configurations, and non-root user enforcement.

Usage:
    python backend/scripts/docker_smoke_test.py
"""

import os
import sys
import subprocess
from pathlib import Path
from typing import List, Tuple

# Base repository root directory
REPO_ROOT = Path(__file__).resolve().parent.parent.parent


class DockerSmokeTester:
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.results: List[Tuple[str, bool, str]] = []

    def record(self, test_name: str, passed: bool, details: str = ""):
        self.results.append((test_name, passed, details))
        status = "PASSED" if passed else "FAILED"
        print(f"[{status}] {test_name}")
        if details and not passed:
            print(f"       Reason: {details}")

    def test_file_existence(self):
        required_files = [
            ".dockerignore",
            "backend/.dockerignore",
            "frontend/.dockerignore",
            "Dockerfile.backend",
            "Dockerfile.frontend",
            "docker/backend/Dockerfile",
            "docker/frontend/Dockerfile",
            "docker/ai-engine/Dockerfile",
            "docker-compose.yml",
            "docker-compose.dev.yml",
            "docker-compose.test.yml",
            "docker-compose.prod.yml",
            "docker-compose.gpu.yml",
            "nginx/voiceguard.conf",
            ".env.example",
        ]
        for rel_path in required_files:
            p = self.root_dir / rel_path
            self.record(
                f"File existence: {rel_path}",
                p.is_file(),
                f"File not found at {p}"
            )

    def test_dockerfile_security(self):
        backend_df = self.root_dir / "Dockerfile.backend"
        if backend_df.is_file():
            content = backend_df.read_text(encoding="utf-8")
            self.record(
                "Backend Dockerfile: Multi-stage build",
                "FROM python:3.11-slim AS builder" in content and "FROM python:3.11-slim AS runtime" in content,
                "Multi-stage builder/runtime pattern missing"
            )
            self.record(
                "Backend Dockerfile: Non-root user voiceguard",
                "useradd" in content and "USER voiceguard" in content,
                "Non-root user creation or switch missing"
            )
            self.record(
                "Backend Dockerfile: Health check defined",
                "HEALTHCHECK" in content,
                "HEALTHCHECK instruction missing in Dockerfile.backend"
            )

        frontend_df = self.root_dir / "Dockerfile.frontend"
        if frontend_df.is_file():
            content = frontend_df.read_text(encoding="utf-8")
            self.record(
                "Frontend Dockerfile: Multi-stage build",
                "FROM node:20-alpine AS builder" in content and "FROM nginx:1.25-alpine AS runtime" in content,
                "Multi-stage builder/runtime pattern missing"
            )
            self.record(
                "Frontend Dockerfile: Non-root user nginx",
                "USER nginx" in content,
                "USER nginx directive missing"
            )
            self.record(
                "Frontend Dockerfile: Health check defined",
                "HEALTHCHECK" in content,
                "HEALTHCHECK instruction missing in Dockerfile.frontend"
            )

        ai_worker_df = self.root_dir / "docker/ai-engine/Dockerfile"
        if ai_worker_df.is_file():
            content = ai_worker_df.read_text(encoding="utf-8")
            self.record(
                "AI Worker Dockerfile: Non-root user voiceguard",
                "useradd" in content and "USER voiceguard" in content,
                "USER voiceguard missing in ai-engine Dockerfile"
            )

    def test_dockerignore_security(self):
        root_ignore = self.root_dir / ".dockerignore"
        if root_ignore.is_file():
            content = root_ignore.read_text(encoding="utf-8")
            sensitive_patterns = [".env", ".git", "venv", "*.db", "node_modules"]
            for pat in sensitive_patterns:
                self.record(
                    f"Dockerignore ignores '{pat}'",
                    pat in content,
                    f"Sensitive pattern '{pat}' omitted from .dockerignore"
                )

    def test_network_isolation(self):
        compose_file = self.root_dir / "docker-compose.yml"
        if compose_file.is_file():
            content = compose_file.read_text(encoding="utf-8")
            self.record(
                "Base Compose: 3 segmented networks defined",
                "frontend-network:" in content and "backend-network:" in content and "data-network:" in content,
                "Missing one of frontend-network, backend-network, or data-network"
            )
            self.record(
                "Base Compose: Internal data network isolation",
                "internal: true" in content,
                "data-network must have 'internal: true' to prevent external routing"
            )
            self.record(
                "Base Compose: DB and Redis host ports NOT exposed",
                "5432:5432" not in content and "6379:6379" not in content,
                "Database or Redis host ports directly exposed in base compose"
            )

    def test_volume_persistence(self):
        compose_file = self.root_dir / "docker-compose.yml"
        if compose_file.is_file():
            content = compose_file.read_text(encoding="utf-8")
            required_vols = ["postgres_data", "redis_data", "model_cache", "audio_storage", "nginx_logs"]
            for vol in required_vols:
                self.record(
                    f"Base Compose: Persistent volume '{vol}' defined",
                    f"{vol}:" in content,
                    f"Volume '{vol}' definition missing in docker-compose.yml"
                )

    def test_compose_configs(self):
        """Validate docker-compose config parsing for all environments using CLI."""
        configs = [
            ("Base config", ["docker-compose", "-f", "docker-compose.yml", "config", "--quiet"], {}),
            ("Dev config", ["docker-compose", "-f", "docker-compose.yml", "-f", "docker-compose.dev.yml", "config", "--quiet"], {}),
            ("Test config", ["docker-compose", "-f", "docker-compose.test.yml", "config", "--quiet"], {}),
            (
                "Prod config",
                ["docker-compose", "-f", "docker-compose.yml", "-f", "docker-compose.prod.yml", "config", "--quiet"],
                {
                    "DB_PASSWORD": "prod_secure_password_test",
                    "REDIS_PASSWORD": "prod_redis_password_test",
                    "SECRET_KEY": "prod_jwt_secret_key_at_least_32_chars!",
                }
            ),
            ("GPU config", ["docker-compose", "-f", "docker-compose.yml", "-f", "docker-compose.gpu.yml", "config", "--quiet"], {}),
        ]

        env_base = os.environ.copy()
        for label, cmd, extra_env in configs:
            run_env = env_base.copy()
            run_env.update(extra_env)
            try:
                res = subprocess.run(
                    cmd,
                    cwd=str(self.root_dir),
                    env=run_env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=30
                )
                passed = (res.returncode == 0)
                details = res.stderr if not passed else ""
                self.record(f"Docker Compose Config: {label}", passed, details.strip())
            except Exception as e:
                self.record(f"Docker Compose Config: {label}", False, str(e))

    def run_all(self) -> int:
        print("=" * 70)
        print(" VoiceGuard AI — Phase 30 Dockerization Smoke Test Suite")
        print("=" * 70)
        self.test_file_existence()
        self.test_dockerfile_security()
        self.test_dockerignore_security()
        self.test_network_isolation()
        self.test_volume_persistence()
        self.test_compose_configs()

        total = len(self.results)
        passed = sum(1 for _, ok, _ in self.results if ok)
        failed = total - passed

        print("=" * 70)
        print(f" Summary: {passed}/{total} tests passed ({failed} failed)")
        print("=" * 70)
        return 0 if failed == 0 else 1


if __name__ == "__main__":
    tester = DockerSmokeTester(REPO_ROOT)
    exit_code = tester.run_all()
    sys.exit(exit_code)


#!/usr/bin/env python3
"""
VoiceGuard AI — Production Health Check & Readiness Script
===========================================================
Used by:
  - Docker HEALTHCHECK
  - Kubernetes readiness/liveness probes
  - Pre-deployment verification scripts
  - CI/CD smoke tests

Exit codes:
  0  — All checks passed (healthy / ready)
  1  — One or more checks failed (unhealthy / not ready)

Usage:
  python health_check.py [--json] [--timeout 10]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass, field
from typing import Any

# ---------------------------------------------------------------------------
# Optional imports — degrade gracefully when unavailable
# ---------------------------------------------------------------------------
try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

try:
    import redis as redis_lib
    HAS_REDIS = True
except ImportError:
    HAS_REDIS = False

try:
    import sqlalchemy
    from sqlalchemy import create_engine, text
    HAS_SQLALCHEMY = True
except ImportError:
    HAS_SQLALCHEMY = False


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class CheckResult:
    name: str
    passed: bool
    message: str
    details: dict[str, Any] = field(default_factory=dict)
    duration_ms: float = 0.0


@dataclass
class HealthReport:
    overall: bool
    checks: list[CheckResult] = field(default_factory=list)
    timestamp: str = ""
    version: str = "1.0.0"

    def to_dict(self) -> dict:
        return {
            "overall": "healthy" if self.overall else "unhealthy",
            "timestamp": self.timestamp,
            "version": self.version,
            "checks": [
                {
                    "name": c.name,
                    "status": "pass" if c.passed else "fail",
                    "message": c.message,
                    "details": c.details,
                    "duration_ms": round(c.duration_ms, 2),
                }
                for c in self.checks
            ],
        }


# ---------------------------------------------------------------------------
# Individual checks
# ---------------------------------------------------------------------------

def _timed(fn) -> tuple[Any, float]:
    """Run fn(), return (result, elapsed_ms)."""
    t0 = time.monotonic()
    result = fn()
    return result, (time.monotonic() - t0) * 1000


def check_secret_key() -> CheckResult:
    """Verify SECRET_KEY is set and meets minimum length requirements."""
    secret = os.getenv("SECRET_KEY", "")
    if not secret:
        return CheckResult("secret_key", False, "SECRET_KEY environment variable is not set")
    if secret in (
        "changeme",
        "secret",
        "dev-secret-key",
        "supersecret",
        "your-secret-key",
    ):
        return CheckResult("secret_key", False, "SECRET_KEY is a known weak/default value — change it")
    if len(secret) < 32:
        return CheckResult(
            "secret_key", False,
            f"SECRET_KEY is too short ({len(secret)} chars); minimum 32 characters required",
        )
    return CheckResult(
        "secret_key", True,
        f"SECRET_KEY is set ({len(secret)} chars)",
        {"length": len(secret)},
    )


def check_database(timeout: int = 5) -> CheckResult:
    """Attempt a simple SELECT 1 against the configured database."""
    if not HAS_SQLALCHEMY:
        return CheckResult("database", False, "sqlalchemy not installed — cannot check DB")

    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        return CheckResult("database", False, "DATABASE_URL environment variable is not set")

    # For health-check use sync driver (replace asyncpg / aiosqlite with sync equivalents)
    sync_url = (
        db_url
        .replace("postgresql+asyncpg://", "postgresql+psycopg2://")
        .replace("sqlite+aiosqlite:///", "sqlite:///")
    )

    try:
        def _connect():
            engine = create_engine(sync_url, connect_args={"connect_timeout": timeout})
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine.dispose()

        _, elapsed = _timed(_connect)
        return CheckResult(
            "database", True,
            "Database connection successful",
            {"url_scheme": sync_url.split("://")[0]},
            elapsed,
        )
    except Exception as exc:
        return CheckResult("database", False, f"Database connection failed: {exc}")


def check_redis(timeout: int = 3) -> CheckResult:
    """Ping the configured Redis server."""
    if not HAS_REDIS:
        return CheckResult("redis", False, "redis-py not installed — cannot check Redis")

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    try:
        def _ping():
            client = redis_lib.from_url(redis_url, socket_connect_timeout=timeout, socket_timeout=timeout)
            response = client.ping()
            client.close()
            return response

        pong, elapsed = _timed(_ping)
        if pong:
            return CheckResult("redis", True, "Redis PING → PONG", {"url": redis_url}, elapsed)
        return CheckResult("redis", False, "Redis PING did not return PONG")
    except Exception as exc:
        return CheckResult("redis", False, f"Redis connection failed: {exc}")


def check_api_health(base_url: str = "http://localhost:8000", timeout: int = 5) -> CheckResult:
    """Call /health endpoint on the running backend."""
    if not HAS_HTTPX:
        return CheckResult("api_health", False, "httpx not installed — cannot check API health")

    url = f"{base_url}/health"
    try:
        def _get():
            with httpx.Client(timeout=timeout) as client:
                return client.get(url)

        resp, elapsed = _timed(_get)
        if resp.status_code == 200:
            body = resp.json()
            return CheckResult(
                "api_health", True,
                "Backend /health returned 200",
                {"status": body.get("status"), "version": body.get("version")},
                elapsed,
            )
        return CheckResult(
            "api_health", False,
            f"Backend /health returned HTTP {resp.status_code}",
            {"body": resp.text[:200]},
            elapsed,
        )
    except Exception as exc:
        return CheckResult("api_health", False, f"API health check failed: {exc}")


def check_environment() -> CheckResult:
    """Verify that required environment variables are present."""
    required = ["SECRET_KEY", "DATABASE_URL"]
    recommended = ["REDIS_URL", "ALLOWED_ORIGINS", "ENVIRONMENT"]

    missing_required = [v for v in required if not os.getenv(v)]
    missing_recommended = [v for v in recommended if not os.getenv(v)]

    if missing_required:
        return CheckResult(
            "environment", False,
            f"Missing required env vars: {', '.join(missing_required)}",
            {"missing_required": missing_required, "missing_recommended": missing_recommended},
        )

    return CheckResult(
        "environment", True,
        "Required environment variables are present",
        {
            "environment": os.getenv("ENVIRONMENT", "unset"),
            "missing_recommended": missing_recommended,
        },
    )


def check_enforce_https() -> CheckResult:
    """In production, ENFORCE_HTTPS should be 'true'."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    enforce = os.getenv("ENFORCE_HTTPS", "false").lower()

    if env == "production" and enforce != "true":
        return CheckResult(
            "enforce_https", False,
            "ENVIRONMENT=production but ENFORCE_HTTPS is not 'true'",
            {"environment": env, "enforce_https": enforce},
        )
    return CheckResult(
        "enforce_https", True,
        f"HTTPS enforcement is {'enabled' if enforce == 'true' else 'not required (non-production)'}",
        {"environment": env, "enforce_https": enforce},
    )


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

def run_health_checks(timeout: int = 5, include_api: bool = False) -> HealthReport:
    from datetime import datetime, timezone

    checks: list[CheckResult] = []

    checks.append(check_environment())
    checks.append(check_secret_key())
    checks.append(check_enforce_https())
    checks.append(check_database(timeout=timeout))
    checks.append(check_redis(timeout=timeout))

    if include_api:
        api_base = os.getenv("API_BASE_URL", "http://localhost:8000")
        checks.append(check_api_health(base_url=api_base, timeout=timeout))

    overall = all(c.passed for c in checks)
    return HealthReport(
        overall=overall,
        checks=checks,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="VoiceGuard AI health check")
    parser.add_argument("--json", action="store_true", help="Output JSON instead of plain text")
    parser.add_argument("--timeout", type=int, default=5, help="Connection timeout in seconds")
    parser.add_argument("--include-api", action="store_true", help="Include HTTP /health endpoint check")
    args = parser.parse_args()

    report = run_health_checks(timeout=args.timeout, include_api=args.include_api)

    if args.json:
        print(json.dumps(report.to_dict(), indent=2))
    else:
        status_icon = "✅" if report.overall else "❌"
        print(f"\nVoiceGuard AI Health Check — {status_icon} {'HEALTHY' if report.overall else 'UNHEALTHY'}")
        print(f"Timestamp: {report.timestamp}\n")
        for c in report.checks:
            icon = "✅" if c.passed else "❌"
            dur = f" ({c.duration_ms:.0f}ms)" if c.duration_ms else ""
            print(f"  {icon}  [{c.name}]{dur}  {c.message}")
            if not c.passed and c.details:
                for k, v in c.details.items():
                    print(f"       {k}: {v}")
        print()

    return 0 if report.overall else 1


if __name__ == "__main__":
    sys.exit(main())


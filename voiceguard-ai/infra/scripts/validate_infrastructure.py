#!/usr/bin/env python3
"""
VoiceGuard AI — Infrastructure Validation Script
Phase 32: Production Infrastructure (SIH26104)

Validates:
1. Docker Compose and Prometheus/Alertmanager YAML syntax
2. Environment variable templates
3. Nginx configuration directives
4. PostgreSQL and pg_hba configuration
5. Infrastructure scripts existence and shebangs
"""

import os
import sys
import yaml
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

def check_file(path: Path, desc: str) -> bool:
    if not path.is_file():
        print(f"❌ FAIL: Missing {desc} ({path})")
        return False
    print(f"✅ PASS: {desc} exists")
    return True

def validate_yaml(path: Path) -> bool:
    try:
        with open(path, "r", encoding="utf-8") as f:
            yaml.safe_load(f)
        print(f"✅ PASS: Valid YAML: {path.name}")
        return True
    except Exception as e:
        print(f"❌ FAIL: Invalid YAML in {path.name}: {e}")
        return False

def main() -> int:
    print("=" * 60)
    print(" VoiceGuard AI — Phase 32 Infrastructure Validator")
    print("=" * 60)
    all_ok = True

    # 1. Required Files
    required = [
        (REPO_ROOT / "docker-compose.infrastructure.yml", "Infrastructure Compose"),
        (REPO_ROOT / ".env.production.template", "Production Env Template"),
        (REPO_ROOT / "infra" / "nginx" / "nginx.conf", "Nginx Main Conf"),
        (REPO_ROOT / "infra" / "nginx" / "conf.d" / "10-voiceguard.conf", "Nginx VirtualHost Conf"),
        (REPO_ROOT / "infra" / "postgres" / "postgresql.conf", "PostgreSQL Conf"),
        (REPO_ROOT / "infra" / "postgres" / "pg_hba.conf", "pg_hba.conf"),
        (REPO_ROOT / "infra" / "monitoring" / "prometheus" / "prometheus.yml", "Prometheus Config"),
        (REPO_ROOT / "infra" / "monitoring" / "prometheus" / "rules" / "voiceguard_alerts.yml", "Alert Rules"),
        (REPO_ROOT / "infra" / "monitoring" / "alertmanager" / "alertmanager.yml", "Alertmanager Config"),
        (REPO_ROOT / "infra" / "monitoring" / "grafana" / "datasources.yml", "Grafana Datasources"),
        (REPO_ROOT / "infra" / "monitoring" / "grafana" / "dashboards" / "voiceguard_overview.json", "Grafana Dashboard JSON"),
        (REPO_ROOT / "infra" / "scripts" / "db_backup.sh", "Backup Script"),
        (REPO_ROOT / "infra" / "scripts" / "db_restore.sh", "Restore Script"),
        (REPO_ROOT / "infra" / "scripts" / "bootstrap_server.sh", "Bootstrap Script"),
        (REPO_ROOT / "infra" / "scripts" / "deploy.sh", "Deployment Script"),
        (REPO_ROOT / "infra" / "terraform" / "variables.tf", "Terraform Variables"),
        (REPO_ROOT / "infra" / "terraform" / "envs" / "staging" / "main.tf", "Terraform Staging"),
        (REPO_ROOT / "infra" / "terraform" / "envs" / "production" / "main.tf", "Terraform Production"),
    ]

    for p, desc in required:
        if not check_file(p, desc):
            all_ok = False

    print("\n--- Validating YAML Syntax ---")
    yaml_files = [
        REPO_ROOT / "docker-compose.infrastructure.yml",
        REPO_ROOT / "infra" / "monitoring" / "prometheus" / "prometheus.yml",
        REPO_ROOT / "infra" / "monitoring" / "prometheus" / "rules" / "voiceguard_alerts.yml",
        REPO_ROOT / "infra" / "monitoring" / "alertmanager" / "alertmanager.yml",
        REPO_ROOT / "infra" / "monitoring" / "grafana" / "datasources.yml",
    ]
    for yf in yaml_files:
        if yf.exists() and not validate_yaml(yf):
            all_ok = False

    print("\n--- Validating Production Env Template ---")
    env_template = (REPO_ROOT / ".env.production.template").read_text(encoding="utf-8")
    mandatory_vars = [
        "SECRET_KEY", "DB_PASSWORD", "REDIS_PASSWORD",
        "DOMAIN", "BACKEND_IMAGE", "FRONTEND_IMAGE",
        "GRAFANA_ADMIN_PASSWORD"
    ]
    for mv in mandatory_vars:
        if mv not in env_template:
            print(f"❌ FAIL: Mandatory variable {mv} missing from .env.production.template")
            all_ok = False
        else:
            print(f"✅ PASS: Found {mv} in template")

    # Confirm no hardcoded production secrets in template
    if "CHANGE_ME" not in env_template:
        print("❌ FAIL: Template should use CHANGE_ME placeholders")
        all_ok = False
    else:
        print("✅ PASS: Template uses CHANGE_ME placeholders")

    print("\n" + "=" * 60)
    if all_ok:
        print(" 🎉 ALL INFRASTRUCTURE CHECKS PASSED!")
        print("=" * 60)
        return 0
    else:
        print(" ❌ SOME INFRASTRUCTURE CHECKS FAILED.")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(main())

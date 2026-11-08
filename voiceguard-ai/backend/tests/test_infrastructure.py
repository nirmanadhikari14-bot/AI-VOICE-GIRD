"""
Phase 32 — Production Infrastructure Verification Test Suite
=============================================================
Tests verify that all infrastructure configuration files:
  - Exist and are syntactically valid
  - Enforce security properties
  - Have proper resource limits
  - Follow production hardening requirements
  - Are consistent across configurations

Run:
    backend\\venv\\Scripts\\pytest.exe backend\\tests\\test_infrastructure.py -v
"""

import os
import sys
import re
import yaml
import json
import pytest

# ── Path bootstrap ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_THIS_DIR)
_VOICEGUARD_DIR = os.path.dirname(_BACKEND_DIR)
_INFRA_DIR = os.path.join(_VOICEGUARD_DIR, "infra")


def _infra_path(*parts) -> str:
    return os.path.join(_INFRA_DIR, *parts)


def _voiceguard_path(*parts) -> str:
    return os.path.join(_VOICEGUARD_DIR, *parts)


def _load_yaml(path: str) -> dict:
    assert os.path.isfile(path), f"File not found: {path}"
    with open(path, "r", encoding="utf-8") as f:
        content = yaml.safe_load(f)
    assert content is not None, f"Empty YAML: {path}"
    return content


def _read(path: str) -> str:
    assert os.path.isfile(path), f"File not found: {path}"
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1 — Infrastructure File Existence
# ─────────────────────────────────────────────────────────────────────────────

REQUIRED_INFRA_FILES = [
    # Docker Compose infrastructure
    "docker-compose.infrastructure.yml",
    ".env.production.template",
    # Nginx
    "infra/nginx/nginx.conf",
    "infra/nginx/conf.d/00-redirect.conf",
    "infra/nginx/conf.d/10-voiceguard.conf",
    # PostgreSQL
    "infra/postgres/postgresql.conf",
    "infra/postgres/pg_hba.conf",
    # Prometheus
    "infra/monitoring/prometheus/prometheus.yml",
    "infra/monitoring/prometheus/rules/voiceguard_alerts.yml",
    # Alertmanager
    "infra/monitoring/alertmanager/alertmanager.yml",
    # Grafana
    "infra/monitoring/grafana/datasources.yml",
    # Scripts
    "infra/scripts/db_backup.sh",
    "infra/scripts/db_restore.sh",
    "infra/scripts/bootstrap_server.sh",
    "infra/scripts/deploy.sh",
    # Terraform
    "infra/terraform/variables.tf",
    "infra/terraform/envs/staging/main.tf",
]


@pytest.mark.parametrize("rel_path", REQUIRED_INFRA_FILES)
def test_infrastructure_file_exists(rel_path: str):
    """All required infrastructure files must exist."""
    path = _voiceguard_path(rel_path)
    assert os.path.isfile(path), f"Required infrastructure file missing: {rel_path}"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2 — Docker Compose Infrastructure Validation
# ─────────────────────────────────────────────────────────────────────────────

class TestDockerComposeInfrastructure:

    def test_compose_is_valid_yaml(self):
        path = _voiceguard_path("docker-compose.infrastructure.yml")
        _load_yaml(path)  # Raises if invalid

    def test_compose_has_required_services(self):
        compose = _load_yaml(_voiceguard_path("docker-compose.infrastructure.yml"))
        services = list(compose.get("services", {}).keys())
        required = ["db", "redis", "backend", "frontend", "nginx",
                    "prometheus", "grafana", "alertmanager",
                    "node-exporter", "postgres-exporter", "redis-exporter"]
        for svc in required:
            assert svc in services, f"Missing service in infrastructure compose: {svc}"

    def test_database_has_no_host_port_exposure(self):
        """PostgreSQL must NOT be exposed to host."""
        compose = _load_yaml(_voiceguard_path("docker-compose.infrastructure.yml"))
        db = compose["services"]["db"]
        ports = db.get("ports", [])
        assert len(ports) == 0, \
            f"PostgreSQL exposes ports to host — SECURITY VIOLATION: {ports}"

    def test_redis_has_no_host_port_exposure(self):
        """Redis must NOT be exposed to host."""
        compose = _load_yaml(_voiceguard_path("docker-compose.infrastructure.yml"))
        redis = compose["services"]["redis"]
        ports = redis.get("ports", [])
        assert len(ports) == 0, \
            f"Redis exposes ports to host — SECURITY VIOLATION: {ports}"

    def test_data_network_is_internal(self):
        """data-network must be internal (isolates PostgreSQL and Redis)."""
        compose = _load_yaml(_voiceguard_path("docker-compose.infrastructure.yml"))
        networks = compose.get("networks", {})
        data_net = networks.get("data-network", {})
        assert data_net.get("internal") is True, \
            "data-network must have 'internal: true' to isolate PostgreSQL and Redis"

    def test_backend_uses_image_not_build(self):
        """In production compose, backend must use pre-built image, not build."""
        compose = _load_yaml(_voiceguard_path("docker-compose.infrastructure.yml"))
        backend = compose["services"]["backend"]
        assert "image" in backend, \
            "Infrastructure compose backend must use 'image' (GHCR digest), not 'build'"
        assert "build" not in backend, \
            "Infrastructure compose backend must NOT use 'build' in production"

    def test_backend_has_resource_limits(self):
        """Backend must have CPU and memory resource limits."""
        compose = _load_yaml(_voiceguard_path("docker-compose.infrastructure.yml"))
        backend = compose["services"]["backend"]
        deploy = backend.get("deploy", {})
        resources = deploy.get("resources", {})
        limits = resources.get("limits", {})
        assert "cpus" in limits, "Backend must have CPU limit"
        assert "memory" in limits, "Backend must have memory limit"

    def test_backend_requires_secret_key_env(self):
        """Backend must require SECRET_KEY (not have a default)."""
        text = _read(_voiceguard_path("docker-compose.infrastructure.yml"))
        # Should use ${SECRET_KEY:?...} syntax to fail on missing value
        assert "SECRET_KEY:?" in text or "SECRET_KEY}" not in text, \
            "Infrastructure compose must require SECRET_KEY (use :? syntax)"

    def test_compose_has_monitoring_services(self):
        """Monitoring services must be present."""
        compose = _load_yaml(_voiceguard_path("docker-compose.infrastructure.yml"))
        services = compose.get("services", {})
        monitoring = ["prometheus", "grafana", "alertmanager"]
        for svc in monitoring:
            assert svc in services, f"Missing monitoring service: {svc}"

    def test_grafana_disables_anonymous_access(self):
        """Grafana must disable anonymous access."""
        compose = _load_yaml(_voiceguard_path("docker-compose.infrastructure.yml"))
        grafana = compose["services"]["grafana"]
        env = grafana.get("environment", {})
        if isinstance(env, list):
            env_dict = dict(e.split("=", 1) for e in env if "=" in e)
        else:
            env_dict = env
        anon = env_dict.get("GF_AUTH_ANONYMOUS_ENABLED", "true")
        assert anon in ["false", '"false"', False], \
            "Grafana anonymous access must be disabled"

    def test_prometheus_uses_internal_network(self):
        """Prometheus should not be on the public-facing network."""
        compose = _load_yaml(_voiceguard_path("docker-compose.infrastructure.yml"))
        prometheus = compose["services"]["prometheus"]
        # Prometheus should have no host ports exposed
        ports = prometheus.get("ports", [])
        assert len(ports) == 0, \
            f"Prometheus must not expose ports to host (use monitoring-network): {ports}"

    def test_compose_has_named_volumes_for_persistence(self):
        """Critical data must use named volumes, not anonymous volumes."""
        compose = _load_yaml(_voiceguard_path("docker-compose.infrastructure.yml"))
        volumes = compose.get("volumes", {})
        required_volumes = ["postgres_data", "redis_data", "prometheus_data", "grafana_data"]
        for vol in required_volumes:
            assert vol in volumes, f"Missing named volume for persistence: {vol}"

    def test_all_services_have_restart_policy(self):
        """All long-running services must have restart: always."""
        compose = _load_yaml(_voiceguard_path("docker-compose.infrastructure.yml"))
        skip_services = {"certbot", "db-backup"}  # Run-once services
        for name, svc in compose.get("services", {}).items():
            if name in skip_services:
                continue
            restart = svc.get("restart", "")
            assert restart in ["always", "unless-stopped"], \
                f"Service '{name}' must have restart: always or unless-stopped (got: {restart!r})"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3 — Environment Template Validation
# ─────────────────────────────────────────────────────────────────────────────

class TestEnvTemplate:

    def test_env_template_exists(self):
        assert os.path.isfile(_voiceguard_path(".env.production.template"))

    def test_env_template_has_no_real_secrets(self):
        """Template must use CHANGE_ME placeholders, not real secrets."""
        text = _read(_voiceguard_path(".env.production.template"))
        # Must have CHANGE_ME markers (not filled in)
        assert "CHANGE_ME" in text, \
            ".env.production.template must have CHANGE_ME placeholders"

    def test_env_template_has_required_variables(self):
        text = _read(_voiceguard_path(".env.production.template"))
        required_vars = [
            "SECRET_KEY", "DB_PASSWORD", "REDIS_PASSWORD",
            "DOMAIN", "BACKEND_IMAGE", "FRONTEND_IMAGE",
            "GRAFANA_ADMIN_PASSWORD",
        ]
        for var in required_vars:
            assert var in text, f".env.production.template missing: {var}"

    def test_env_template_does_not_contain_sqlite(self):
        """Production env must NOT default to SQLite."""
        text = _read(_voiceguard_path(".env.production.template"))
        assert "sqlite" not in text.lower(), \
            ".env.production.template must not reference SQLite"

    def test_env_template_uses_ghcr(self):
        text = _read(_voiceguard_path(".env.production.template"))
        assert "ghcr.io" in text, \
            ".env.production.template must reference GHCR for image registry"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4 — Nginx Configuration Validation
# ─────────────────────────────────────────────────────────────────────────────

class TestNginxConfiguration:

    def test_nginx_conf_exists(self):
        assert os.path.isfile(_infra_path("nginx", "nginx.conf"))

    def test_nginx_hides_server_version(self):
        text = _read(_infra_path("nginx", "nginx.conf"))
        assert "server_tokens off" in text, \
            "Nginx must hide server version (server_tokens off)"

    def test_nginx_has_rate_limiting(self):
        text = _read(_infra_path("nginx", "nginx.conf"))
        assert "limit_req_zone" in text, \
            "Nginx must configure rate limiting zones"
        assert "auth_zone" in text or "auth" in text, \
            "Nginx must have auth-specific rate limiting"

    def test_nginx_vhost_has_https_redirect(self):
        """HTTP must redirect to HTTPS."""
        text = _read(_infra_path("nginx", "conf.d", "00-redirect.conf"))
        assert "301" in text or "return" in text, \
            "Nginx must redirect HTTP to HTTPS (301)"
        assert "acme-challenge" in text, \
            "Nginx HTTP vhost must pass ACME challenge for Let's Encrypt"

    def test_nginx_vhost_has_hsts(self):
        """HTTPS vhost must have HSTS header."""
        text = _read(_infra_path("nginx", "conf.d", "10-voiceguard.conf"))
        assert "Strict-Transport-Security" in text, \
            "Nginx must set HSTS header"
        assert "max-age" in text, \
            "HSTS header must include max-age"

    def test_nginx_vhost_has_websocket_proxy(self):
        text = _read(_infra_path("nginx", "conf.d", "10-voiceguard.conf"))
        assert "/ws/" in text, "Nginx must proxy WebSocket connections"
        assert "Upgrade" in text, "Nginx WebSocket proxy must handle Upgrade header"

    def test_nginx_vhost_uses_tls_12_and_13_only(self):
        """Should not allow TLS 1.0 or 1.1."""
        text = _read(_infra_path("nginx", "conf.d", "10-voiceguard.conf"))
        assert "TLSv1.2" in text and "TLSv1.3" in text, \
            "Nginx must require TLS 1.2 and 1.3"
        assert "TLSv1.0" not in text and "TLSv1.1" not in text, \
            "Nginx must NOT allow TLS 1.0 or 1.1"

    def test_nginx_vhost_blocks_hidden_files(self):
        text = _read(_infra_path("nginx", "conf.d", "10-voiceguard.conf"))
        assert "/\\." in text or r"/\." in text, \
            "Nginx must block access to hidden files (.env, .git, etc.)"

    def test_nginx_vhost_has_x_frame_options(self):
        text = _read(_infra_path("nginx", "conf.d", "10-voiceguard.conf"))
        assert "X-Frame-Options" in text, \
            "Nginx must set X-Frame-Options header"

    def test_nginx_vhost_has_content_security_policy(self):
        text = _read(_infra_path("nginx", "conf.d", "10-voiceguard.conf"))
        assert "Content-Security-Policy" in text, \
            "Nginx must set Content-Security-Policy header"

    def test_nginx_vhost_has_upload_size_limit(self):
        text = _read(_infra_path("nginx", "conf.d", "10-voiceguard.conf"))
        assert "client_max_body_size" in text, \
            "Nginx must set upload size limit for audio endpoints"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5 — Prometheus Configuration
# ─────────────────────────────────────────────────────────────────────────────

class TestPrometheusConfiguration:

    def test_prometheus_config_valid_yaml(self):
        path = _infra_path("monitoring", "prometheus", "prometheus.yml")
        _load_yaml(path)

    def test_prometheus_scrapes_backend(self):
        config = _load_yaml(_infra_path("monitoring", "prometheus", "prometheus.yml"))
        jobs = [sc.get("job_name", "") for sc in config.get("scrape_configs", [])]
        assert any("backend" in j or "voiceguard" in j for j in jobs), \
            "Prometheus must scrape voiceguard-backend"

    def test_prometheus_scrapes_postgresql(self):
        config = _load_yaml(_infra_path("monitoring", "prometheus", "prometheus.yml"))
        jobs = [sc.get("job_name", "") for sc in config.get("scrape_configs", [])]
        assert any("postgres" in j for j in jobs), \
            "Prometheus must scrape PostgreSQL exporter"

    def test_prometheus_scrapes_redis(self):
        config = _load_yaml(_infra_path("monitoring", "prometheus", "prometheus.yml"))
        jobs = [sc.get("job_name", "") for sc in config.get("scrape_configs", [])]
        assert any("redis" in j for j in jobs), \
            "Prometheus must scrape Redis exporter"

    def test_prometheus_has_alertmanager(self):
        config = _load_yaml(_infra_path("monitoring", "prometheus", "prometheus.yml"))
        alerting = config.get("alerting", {})
        managers = alerting.get("alertmanagers", [])
        assert len(managers) > 0, "Prometheus must reference Alertmanager"

    def test_prometheus_has_rule_files(self):
        config = _load_yaml(_infra_path("monitoring", "prometheus", "prometheus.yml"))
        rules = config.get("rule_files", [])
        assert len(rules) > 0, "Prometheus must reference alert rule files"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6 — Alert Rules Validation
# ─────────────────────────────────────────────────────────────────────────────

class TestAlertRules:

    def test_alert_rules_valid_yaml(self):
        path = _infra_path("monitoring", "prometheus", "rules", "voiceguard_alerts.yml")
        _load_yaml(path)

    def test_alert_rules_has_backend_down_alert(self):
        rules_yaml = _load_yaml(_infra_path("monitoring", "prometheus", "rules", "voiceguard_alerts.yml"))
        all_alerts = [
            rule.get("alert", "")
            for group in rules_yaml.get("groups", [])
            for rule in group.get("rules", [])
        ]
        assert any("BackendDown" in a or "backend" in a.lower() for a in all_alerts), \
            "Must have BackendDown alert rule"

    def test_alert_rules_has_postgresql_alert(self):
        rules_yaml = _load_yaml(_infra_path("monitoring", "prometheus", "rules", "voiceguard_alerts.yml"))
        all_alerts = [
            rule.get("alert", "")
            for group in rules_yaml.get("groups", [])
            for rule in group.get("rules", [])
        ]
        assert any("postgres" in a.lower() or "PostgreSQL" in a for a in all_alerts), \
            "Must have PostgreSQL alert rules"

    def test_alert_rules_has_redis_alert(self):
        rules_yaml = _load_yaml(_infra_path("monitoring", "prometheus", "rules", "voiceguard_alerts.yml"))
        all_alerts = [
            rule.get("alert", "")
            for group in rules_yaml.get("groups", [])
            for rule in group.get("rules", [])
        ]
        assert any("redis" in a.lower() or "Redis" in a for a in all_alerts), \
            "Must have Redis alert rules"

    def test_alert_rules_has_tls_expiry_alert(self):
        rules_yaml = _load_yaml(_infra_path("monitoring", "prometheus", "rules", "voiceguard_alerts.yml"))
        all_alerts = [
            rule.get("alert", "")
            for group in rules_yaml.get("groups", [])
            for rule in group.get("rules", [])
        ]
        assert any("TLS" in a or "tls" in a.lower() or "cert" in a.lower() for a in all_alerts), \
            "Must have TLS certificate expiry alert"

    def test_all_alerts_have_severity_labels(self):
        rules_yaml = _load_yaml(_infra_path("monitoring", "prometheus", "rules", "voiceguard_alerts.yml"))
        for group in rules_yaml.get("groups", []):
            for rule in group.get("rules", []):
                if "alert" in rule:
                    labels = rule.get("labels", {})
                    assert "severity" in labels, \
                        f"Alert '{rule['alert']}' missing 'severity' label"

    def test_all_alerts_have_summary_annotation(self):
        rules_yaml = _load_yaml(_infra_path("monitoring", "prometheus", "rules", "voiceguard_alerts.yml"))
        for group in rules_yaml.get("groups", []):
            for rule in group.get("rules", []):
                if "alert" in rule:
                    annotations = rule.get("annotations", {})
                    assert "summary" in annotations, \
                        f"Alert '{rule['alert']}' missing 'summary' annotation"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7 — PostgreSQL Configuration
# ─────────────────────────────────────────────────────────────────────────────

class TestPostgreSQLConfiguration:

    def test_postgresql_conf_exists(self):
        assert os.path.isfile(_infra_path("postgres", "postgresql.conf"))

    def test_pg_hba_conf_exists(self):
        assert os.path.isfile(_infra_path("postgres", "pg_hba.conf"))

    def test_postgresql_conf_has_connection_limit(self):
        text = _read(_infra_path("postgres", "postgresql.conf"))
        assert "max_connections" in text, \
            "postgresql.conf must set max_connections"

    def test_postgresql_conf_has_shared_buffers(self):
        text = _read(_infra_path("postgres", "postgresql.conf"))
        assert "shared_buffers" in text, \
            "postgresql.conf must tune shared_buffers"

    def test_postgresql_conf_has_slow_query_logging(self):
        text = _read(_infra_path("postgres", "postgresql.conf"))
        assert "log_min_duration_statement" in text, \
            "postgresql.conf must enable slow query logging"

    def test_pg_hba_uses_scram_sha_256(self):
        """Should use SCRAM-SHA-256 authentication, not md5."""
        text = _read(_infra_path("postgres", "pg_hba.conf"))
        assert "scram-sha-256" in text, \
            "pg_hba.conf must use scram-sha-256 (not md5)"
        assert "trust" not in text.split("#")[0], \
            "pg_hba.conf must not use 'trust' authentication for network connections"

    def test_pg_hba_rejects_all_other_connections(self):
        text = _read(_infra_path("postgres", "pg_hba.conf"))
        assert "reject" in text, \
            "pg_hba.conf must explicitly reject unauthorized connections"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8 — Script Validation
# ─────────────────────────────────────────────────────────────────────────────

class TestInfrastructureScripts:

    def test_backup_script_has_verification(self):
        text = _read(_infra_path("scripts", "db_backup.sh"))
        assert "gunzip -t" in text or "verify" in text.lower(), \
            "db_backup.sh must verify backup file integrity"

    def test_backup_script_has_retention_cleanup(self):
        text = _read(_infra_path("scripts", "db_backup.sh"))
        assert "find" in text and "mtime" in text, \
            "db_backup.sh must clean up old backups (find -mtime)"

    def test_restore_script_has_safety_prompt(self):
        text = _read(_infra_path("scripts", "db_restore.sh"))
        assert "sleep" in text or "read" in text or "DESTRUCTIVE" in text.upper(), \
            "db_restore.sh must have a safety confirmation before destructive operations"

    def test_restore_script_verifies_restore(self):
        text = _read(_infra_path("scripts", "db_restore.sh"))
        assert "table" in text.lower() or "count" in text.lower(), \
            "db_restore.sh must verify table count after restore"

    def test_deploy_script_validates_digest_format(self):
        text = _read(_infra_path("scripts", "deploy.sh"))
        assert "sha256" in text, \
            "deploy.sh must validate sha256 digest format"

    def test_deploy_script_runs_migrations(self):
        text = _read(_infra_path("scripts", "deploy.sh"))
        assert "alembic upgrade head" in text, \
            "deploy.sh must run alembic upgrade head before deploying"

    def test_deploy_script_checks_health(self):
        text = _read(_infra_path("scripts", "deploy.sh"))
        assert "health" in text.lower(), \
            "deploy.sh must check application health after deploy"

    def test_bootstrap_script_configures_firewall(self):
        text = _read(_infra_path("scripts", "bootstrap_server.sh"))
        assert "ufw" in text, \
            "bootstrap_server.sh must configure UFW firewall"
        # Verify that internal service ports are NOT opened
        dangerous_ports = ["5432", "6379", "9090", "3000"]
        for port in dangerous_ports:
            # Find UFW allow rules (not comments)
            allow_lines = [l for l in text.splitlines()
                          if "ufw allow" in l and not l.strip().startswith("#")]
            port_exposed = any(port in line for line in allow_lines)
            assert not port_exposed, \
                f"bootstrap_server.sh must NOT open port {port} in firewall"

    def test_bootstrap_script_sets_up_backup_cron(self):
        text = _read(_infra_path("scripts", "bootstrap_server.sh"))
        assert "crontab" in text or "cron" in text, \
            "bootstrap_server.sh must configure automated backup cron"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 9 — Cross-infrastructure Security
# ─────────────────────────────────────────────────────────────────────────────

class TestCrossInfrastructureSecurity:

    def test_no_infra_file_contains_hardcoded_passwords(self):
        """No infrastructure file may contain hardcoded production passwords."""
        forbidden = ["password123", "changeme", "secret123", "admin123",
                     "voiceguard_dev_password"]  # Dev defaults must not appear in prod config
        infra_files = [
            ".env.production.template",
            "docker-compose.infrastructure.yml",
            "infra/nginx/nginx.conf",
            "infra/postgres/postgresql.conf",
        ]
        for rel_path in infra_files:
            text = _read(_voiceguard_path(rel_path)).lower()
            for pw in forbidden:
                assert pw.lower() not in text, \
                    f"{rel_path} contains forbidden pattern: '{pw}'"

    def test_production_compose_requires_env_vars_not_defaults(self):
        """In production, required env vars must use :? syntax (fail on missing)."""
        text = _read(_voiceguard_path("docker-compose.infrastructure.yml"))
        # These critical secrets must NOT have defaults in production compose
        critical_vars = ["DB_PASSWORD", "REDIS_PASSWORD", "SECRET_KEY"]
        for var in critical_vars:
            # :? means "fail if unset" — required pattern
            assert f"{var}:?" in text, \
                f"Production compose must require {var} without defaults (:? syntax)"

    def test_monitoring_network_is_internal(self):
        """Monitoring network should be internal (Prometheus not publicly routable)."""
        compose = _load_yaml(_voiceguard_path("docker-compose.infrastructure.yml"))
        networks = compose.get("networks", {})
        monitoring_net = networks.get("monitoring-network", {})
        assert monitoring_net.get("internal") is True, \
            "monitoring-network must be internal (Prometheus/Alertmanager not publicly accessible)"

    def test_grafana_disables_user_signup(self):
        """Grafana must not allow self-signup."""
        compose = _load_yaml(_voiceguard_path("docker-compose.infrastructure.yml"))
        grafana = compose["services"]["grafana"]
        env = grafana.get("environment", {})
        if isinstance(env, list):
            env_text = "\n".join(env)
        else:
            env_text = str(env)
        assert "ALLOW_SIGN_UP" in env_text and "false" in env_text.lower(), \
            "Grafana must disable user sign-up (GF_USERS_ALLOW_SIGN_UP=false)"


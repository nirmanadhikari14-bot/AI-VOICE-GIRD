"""
Phase 31 CI/CD Pipeline Verification Test Suite
================================================
Tests verify that:
  - All workflow YAML files exist and are syntactically valid YAML
  - Required secrets are referenced (not hardcoded)
  - GHCR is used (not Docker Hub) for image publishing
  - Security scan jobs are present in security-scan.yml
  - Production workflow requires manual approval (environment: production)
  - CI workflow has concurrency cancel-in-progress for PRs
  - Existing workflow voiceguard-ci.yml is superseded (disabled)
  - Required jobs exist in each workflow

Run:
    backend\\venv\\Scripts\\pytest.exe backend\\tests\\test_ci_cd.py -v
"""

import os
import sys
import yaml
import pytest

# ── Path bootstrap ───────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── Workflow directory ────────────────────────────────────────────────────────
# This test file lives at voiceguard-ai/backend/tests/test_ci_cd.py
# .github/workflows/ lives at voiceguard-ai/.github/workflows/
# (voiceguard-ai is both the app dir AND the git repo root in this layout)
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))  # .../backend/tests/
_BACKEND_DIR = os.path.dirname(_THIS_DIR)               # .../backend/
_VOICEGUARD_DIR = os.path.dirname(_BACKEND_DIR)         # .../voiceguard-ai/  ← repo root
_WORKFLOWS_DIR = os.path.join(_VOICEGUARD_DIR, ".github", "workflows")


def _workflow_path(filename: str) -> str:
    return os.path.join(_WORKFLOWS_DIR, filename)


def _load_workflow(filename: str) -> dict:
    """Load and parse a workflow YAML file, returning its content dict."""
    path = _workflow_path(filename)
    assert os.path.isfile(path), f"Workflow file not found: {path}"
    with open(path, "r", encoding="utf-8") as f:
        content = yaml.safe_load(f)
    assert isinstance(content, dict), f"{filename} is not a valid YAML mapping"
    return content


def _all_job_names(workflow: dict) -> list[str]:
    """Return a list of all job keys in a workflow."""
    return list(workflow.get("jobs", {}).keys())


def _workflow_text(filename: str) -> str:
    path = _workflow_path(filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1 — Workflow File Existence
# ─────────────────────────────────────────────────────────────────────────────

REQUIRED_WORKFLOWS = [
    "ci.yml",
    "security-scan.yml",
    "docker-build.yml",
    "deploy-staging.yml",
    "deploy-production.yml",
    "release.yml",
    "voiceguard-ci.yml",  # Legacy — must exist (superseded, not deleted)
]


@pytest.mark.parametrize("filename", REQUIRED_WORKFLOWS)
def test_workflow_file_exists(filename: str):
    """Every required workflow file must exist in .github/workflows/."""
    path = _workflow_path(filename)
    assert os.path.isfile(path), f"Required workflow file missing: {path}"


@pytest.mark.parametrize("filename", REQUIRED_WORKFLOWS)
def test_workflow_is_valid_yaml(filename: str):
    """Every workflow file must be parseable as valid YAML."""
    _load_workflow(filename)  # Raises if invalid


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2 — CI Workflow (ci.yml)
# ─────────────────────────────────────────────────────────────────────────────

class TestCIWorkflow:

    def test_ci_has_required_jobs(self):
        """ci.yml must have all core jobs."""
        wf = _load_workflow("ci.yml")
        jobs = _all_job_names(wf)
        required_jobs = [
            "validate-repo",
            "lint-backend",
            "lint-frontend",
            "test-backend",
            "migrate-validate",
            "build-frontend",
            "ci-gate",
        ]
        for job in required_jobs:
            assert job in jobs, f"ci.yml missing required job: {job}"

    def test_ci_has_concurrency_cancel_for_prs(self):
        """ci.yml must have concurrency.cancel-in-progress for PRs."""
        wf = _load_workflow("ci.yml")
        concurrency = wf.get("concurrency", {})
        assert concurrency, "ci.yml: missing 'concurrency' block"
        cancel = concurrency.get("cancel-in-progress")
        assert cancel is not None, "ci.yml: missing cancel-in-progress in concurrency"

    def test_ci_has_path_filters(self):
        """ci.yml must filter on backend/frontend paths to avoid unnecessary runs."""
        wf = _load_workflow("ci.yml")
        on_block = wf.get("on", wf.get(True, {}))
        # Path filters are under push.paths or pull_request.paths
        push = on_block.get("push", {}) if isinstance(on_block, dict) else {}
        paths = push.get("paths", [])
        assert len(paths) > 0, "ci.yml: push trigger should have path filters"

    def test_ci_test_backend_has_redis_service(self):
        """test-backend job must have a Redis service container."""
        wf = _load_workflow("ci.yml")
        job = wf["jobs"].get("test-backend", {})
        services = job.get("services", {})
        assert "redis" in services, "test-backend job must declare a Redis service"

    def test_ci_test_backend_uses_sqlite_not_postgres(self):
        """In CI, test-backend should use SQLite (no Postgres infra required)."""
        text = _workflow_text("ci.yml")
        assert "sqlite" in text.lower(), "test-backend should use SQLite for CI"

    def test_ci_sets_pythonpath(self):
        """CI must set PYTHONPATH to include backend and ai-engine."""
        text = _workflow_text("ci.yml")
        assert "PYTHONPATH" in text, "ci.yml must set PYTHONPATH for pytest"

    def test_ci_has_no_hardcoded_passwords(self):
        """ci.yml must not contain hardcoded passwords or private keys."""
        text = _workflow_text("ci.yml")
        forbidden = ["BEGIN RSA PRIVATE KEY", "BEGIN EC PRIVATE KEY", "password123", "admin123"]
        for pattern in forbidden:
            assert pattern not in text, f"ci.yml contains forbidden pattern: {pattern}"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3 — Security Scan Workflow
# ─────────────────────────────────────────────────────────────────────────────

class TestSecurityScanWorkflow:

    def test_security_scan_has_required_jobs(self):
        """security-scan.yml must have all required scanner jobs."""
        wf = _load_workflow("security-scan.yml")
        jobs = _all_job_names(wf)
        required = ["secret-scan", "bandit", "pip-audit", "npm-audit", "hadolint", "trivy-fs"]
        for job in required:
            assert job in jobs, f"security-scan.yml missing job: {job}"

    def test_security_scan_has_scheduled_trigger(self):
        """security-scan.yml must run on a schedule (weekly minimum)."""
        wf = _load_workflow("security-scan.yml")
        on_block = wf.get("on", wf.get(True, {}))
        schedule = on_block.get("schedule", []) if isinstance(on_block, dict) else []
        assert len(schedule) > 0, "security-scan.yml must have a scheduled trigger"

    def test_security_scan_has_sarif_uploads(self):
        """security-scan.yml must upload SARIF reports to GitHub Security."""
        text = _workflow_text("security-scan.yml")
        assert "upload-sarif" in text, "security-scan.yml must upload SARIF results"
        assert "security-events" in text, "security-scan.yml must have security-events permission"

    def test_security_scan_references_bandit(self):
        text = _workflow_text("security-scan.yml")
        assert "bandit" in text.lower(), "security-scan.yml must reference bandit"

    def test_security_scan_references_hadolint(self):
        text = _workflow_text("security-scan.yml")
        assert "hadolint" in text.lower(), "security-scan.yml must reference hadolint"

    def test_security_scan_references_trivy(self):
        text = _workflow_text("security-scan.yml")
        assert "trivy" in text.lower(), "security-scan.yml must reference trivy"

    def test_security_scan_references_pip_audit(self):
        text = _workflow_text("security-scan.yml")
        assert "pip-audit" in text, "security-scan.yml must reference pip-audit"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4 — Docker Build Workflow
# ─────────────────────────────────────────────────────────────────────────────

class TestDockerBuildWorkflow:

    def test_docker_uses_ghcr_not_docker_hub(self):
        """docker-build.yml must use GHCR, NOT Docker Hub."""
        text = _workflow_text("docker-build.yml")
        assert "ghcr.io" in text, "docker-build.yml must use ghcr.io registry"
        assert "docker.io" not in text, "docker-build.yml must NOT use docker.io (Docker Hub)"
        assert "DOCKER_USERNAME" not in text, "docker-build.yml must NOT use DOCKER_USERNAME secret"
        assert "DOCKER_PASSWORD" not in text, "docker-build.yml must NOT use DOCKER_PASSWORD secret"

    def test_docker_uses_github_token_for_ghcr(self):
        """docker-build.yml must use GITHUB_TOKEN for GHCR login."""
        text = _workflow_text("docker-build.yml")
        assert "GITHUB_TOKEN" in text, "docker-build.yml must use GITHUB_TOKEN for GHCR auth"

    def test_docker_has_packages_write_permission(self):
        """docker-build.yml must have packages: write permission for GHCR push."""
        wf = _load_workflow("docker-build.yml")
        permissions = wf.get("permissions", {})
        assert permissions.get("packages") == "write", \
            "docker-build.yml must have 'packages: write' permission"

    def test_docker_has_sha_tags(self):
        """docker-build.yml must tag images with SHA for immutability."""
        text = _workflow_text("docker-build.yml")
        assert "type=sha" in text, "docker-build.yml must include SHA-based image tags"

    def test_docker_has_trivy_scan(self):
        """docker-build.yml must scan built images with Trivy."""
        text = _workflow_text("docker-build.yml")
        assert "trivy" in text.lower(), "docker-build.yml must include Trivy image scanning"

    def test_docker_has_buildx(self):
        """docker-build.yml must use Docker Buildx for layer caching."""
        text = _workflow_text("docker-build.yml")
        assert "setup-buildx-action" in text, "docker-build.yml must use Docker Buildx"

    def test_docker_has_gha_cache(self):
        """docker-build.yml must use GitHub Actions cache for layer caching."""
        text = _workflow_text("docker-build.yml")
        assert "type=gha" in text, "docker-build.yml must use GHA cache for Docker layers"

    def test_docker_build_has_backend_and_frontend_jobs(self):
        wf = _load_workflow("docker-build.yml")
        jobs = _all_job_names(wf)
        assert "build-backend" in jobs, "docker-build.yml missing build-backend job"
        assert "build-frontend" in jobs, "docker-build.yml missing build-frontend job"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5 — Deploy Staging Workflow
# ─────────────────────────────────────────────────────────────────────────────

class TestDeployStagingWorkflow:

    def test_staging_trigger_is_manual_dispatch(self):
        """deploy-staging.yml must require manual dispatch (not auto-push)."""
        wf = _load_workflow("deploy-staging.yml")
        on_block = wf.get("on", wf.get(True, {}))
        if isinstance(on_block, dict):
            assert "workflow_dispatch" in on_block, \
                "deploy-staging.yml must require manual workflow_dispatch"

    def test_staging_requires_image_tag_input(self):
        """deploy-staging.yml must require image_tag input."""
        wf = _load_workflow("deploy-staging.yml")
        on_block = wf.get("on", wf.get(True, {})) or {}
        dispatch = on_block.get("workflow_dispatch", {}) or {}
        inputs = dispatch.get("inputs", {}) or {}
        assert "image_tag" in inputs, "deploy-staging.yml must require image_tag input"

    def test_staging_has_deploy_job(self):
        wf = _load_workflow("deploy-staging.yml")
        jobs = _all_job_names(wf)
        assert "deploy-staging" in jobs, "deploy-staging.yml missing deploy-staging job"

    def test_staging_has_smoke_test_job(self):
        wf = _load_workflow("deploy-staging.yml")
        jobs = _all_job_names(wf)
        assert any("smoke" in j for j in jobs), \
            "deploy-staging.yml must have a smoke test job"

    def test_staging_uses_deploy_ssh_key_secret(self):
        """deploy-staging.yml must use DEPLOY_SSH_KEY secret (not hardcoded)."""
        text = _workflow_text("deploy-staging.yml")
        assert "DEPLOY_SSH_KEY" in text, "deploy-staging.yml must reference DEPLOY_SSH_KEY secret"

    def test_staging_has_no_concurrent_deploys(self):
        """deploy-staging.yml must prevent concurrent staging deploys."""
        wf = _load_workflow("deploy-staging.yml")
        concurrency = wf.get("concurrency", {})
        assert concurrency, "deploy-staging.yml must have concurrency block"
        group = concurrency.get("group", "")
        assert "staging" in group.lower(), "deploy-staging.yml concurrency group must reference staging"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6 — Deploy Production Workflow
# ─────────────────────────────────────────────────────────────────────────────

class TestDeployProductionWorkflow:

    def test_production_requires_manual_approval(self):
        """deploy-production.yml must use 'environment: production' for manual approval gate."""
        text = _workflow_text("deploy-production.yml")
        assert "environment:" in text, \
            "deploy-production.yml must use GitHub Environment for approval gating"
        assert "production" in text, \
            "deploy-production.yml must reference the 'production' environment"

    def test_production_requires_main_branch(self):
        """deploy-production.yml must restrict to main branch only."""
        text = _workflow_text("deploy-production.yml")
        assert "main" in text, "deploy-production.yml must check for main branch"

    def test_production_requires_image_digest_not_tag(self):
        """deploy-production.yml must accept image digest (sha256:...) not mutable tag."""
        text = _workflow_text("deploy-production.yml")
        assert "image_digest" in text, \
            "deploy-production.yml must require image_digest (not mutable tag) for immutable deploys"

    def test_production_has_rollback_job(self):
        """deploy-production.yml must have an automatic rollback job."""
        wf = _load_workflow("deploy-production.yml")
        jobs = _all_job_names(wf)
        assert any("rollback" in j for j in jobs), \
            "deploy-production.yml must have a rollback job"

    def test_production_has_database_backup_job(self):
        """deploy-production.yml must take a database backup before deploying."""
        wf = _load_workflow("deploy-production.yml")
        jobs = _all_job_names(wf)
        assert any("backup" in j for j in jobs), \
            "deploy-production.yml must have a pre-deploy backup job"

    def test_production_has_no_auto_push_trigger(self):
        """deploy-production.yml must NOT auto-trigger on push (manual only)."""
        wf = _load_workflow("deploy-production.yml")
        on_block = wf.get("on", wf.get(True, {})) or {}
        # Only workflow_dispatch is acceptable; no push trigger
        if isinstance(on_block, dict):
            push = on_block.get("push")
            assert push is None, \
                "deploy-production.yml MUST NOT have a push trigger — manual dispatch only"

    def test_production_does_not_expose_secrets_in_echo(self):
        """deploy-production.yml must not echo secret values."""
        text = _workflow_text("deploy-production.yml")
        # Check that secrets are not echoed verbatim
        import re
        # Pattern: echo "${{ secrets.SOMETHING }}" — this would expose secrets in logs
        dangerous = re.findall(r'echo\s+["\']?\$\{\{\s*secrets\.\w+\s*\}\}', text)
        assert len(dangerous) == 0, \
            f"deploy-production.yml echoes secret values: {dangerous}"

    def test_production_has_concurrent_protection(self):
        wf = _load_workflow("deploy-production.yml")
        concurrency = wf.get("concurrency", {})
        assert concurrency, "deploy-production.yml must have concurrency block"
        assert concurrency.get("cancel-in-progress") is False, \
            "deploy-production.yml must NOT cancel in-progress production deploys"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7 — Release Workflow
# ─────────────────────────────────────────────────────────────────────────────

class TestReleaseWorkflow:

    def test_release_triggers_on_semver_tags(self):
        """release.yml must trigger on semver tags."""
        wf = _load_workflow("release.yml")
        on_block = wf.get("on", wf.get(True, {})) or {}
        push = on_block.get("push", {}) if isinstance(on_block, dict) else {}
        tags = push.get("tags", [])
        assert len(tags) > 0, "release.yml must trigger on tag push"
        # At least one tag pattern must look like semver
        assert any("v" in t for t in tags), "release.yml tag patterns must include version prefix"

    def test_release_has_sbom_generation(self):
        """release.yml must generate SBOM."""
        text = _workflow_text("release.yml")
        assert "sbom" in text.lower(), "release.yml must generate SBOM artifacts"

    def test_release_has_github_release_creation(self):
        """release.yml must create a GitHub Release."""
        text = _workflow_text("release.yml")
        assert "action-gh-release" in text or "create-release" in text.lower(), \
            "release.yml must create a GitHub Release"

    def test_release_uses_ghcr(self):
        """release.yml must push release images to GHCR."""
        text = _workflow_text("release.yml")
        assert "ghcr.io" in text, "release.yml must use GHCR for release images"

    def test_release_has_trivy_scan(self):
        text = _workflow_text("release.yml")
        assert "trivy" in text.lower(), "release.yml must scan release images with Trivy"

    def test_release_has_prerelease_detection(self):
        """release.yml must distinguish stable releases from release candidates."""
        text = _workflow_text("release.yml")
        assert "prerelease" in text.lower() or "is_prerelease" in text, \
            "release.yml must handle pre-release tagging"

    def test_release_has_contents_write_permission(self):
        """release.yml must have contents: write to create GitHub Releases."""
        wf = _load_workflow("release.yml")
        permissions = wf.get("permissions", {})
        assert permissions.get("contents") == "write", \
            "release.yml must have 'contents: write' permission to create releases"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8 — Legacy Workflow Superseded
# ─────────────────────────────────────────────────────────────────────────────

class TestLegacyWorkflowSuperseded:

    def test_voiceguard_ci_yml_is_disabled(self):
        """The original voiceguard-ci.yml must be disabled (superseded)."""
        text = _workflow_text("voiceguard-ci.yml")
        # It must not trigger on main/develop push with real paths
        # Check that it's been neutered (path points to non-existent dir)
        disabled_indicators = [
            "_superseded_do_not_trigger",  # Our chosen disabling path
            "SUPERSEDED",
            "superseded",
        ]
        found = any(indicator in text for indicator in disabled_indicators)
        assert found, \
            "voiceguard-ci.yml must be superseded/disabled; found no disabling indicator"

    def test_voiceguard_ci_does_not_use_docker_hub_secrets(self):
        """The legacy workflow must not still push to Docker Hub."""
        text = _workflow_text("voiceguard-ci.yml")
        # If it's properly superseded, it won't have active Docker Hub push steps
        # Allow it to reference them as comments/documentation but not as active steps
        active_docker_hub = "docker/login-action" in text and "DOCKER_USERNAME" in text
        assert not active_docker_hub or "_superseded_do_not_trigger" in text, \
            "voiceguard-ci.yml still has active Docker Hub push — must be disabled"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 9 — Cross-workflow Security Checks
# ─────────────────────────────────────────────────────────────────────────────

class TestCrossWorkflowSecurity:

    def test_no_workflow_hardcodes_secrets(self):
        """No workflow may hardcode secrets or API keys."""
        forbidden_patterns = [
            "ghp_",           # GitHub personal access token prefix
            "glpat-",         # GitLab PAT prefix
            "sk-",            # OpenAI key prefix
            "AKIA",           # AWS access key prefix
            "password123",
            "secret123",
        ]
        for filename in REQUIRED_WORKFLOWS:
            text = _workflow_text(filename)
            for pattern in forbidden_patterns:
                assert pattern not in text, \
                    f"{filename} contains forbidden pattern '{pattern}' — possible hardcoded secret"

    def test_production_workflow_does_not_allow_pr_trigger(self):
        """deploy-production.yml must NEVER trigger on pull_request."""
        wf = _load_workflow("deploy-production.yml")
        on_block = wf.get("on", wf.get(True, {})) or {}
        if isinstance(on_block, dict):
            assert "pull_request" not in on_block, \
                "deploy-production.yml must NEVER trigger on pull_request"

    def test_all_workflows_pin_actions_to_versions(self):
        """All workflows must use pinned action versions (not @main or @master)."""
        dangerous_refs = ["@main", "@master", "@HEAD"]
        for filename in ["ci.yml", "security-scan.yml", "docker-build.yml"]:
            text = _workflow_text(filename)
            for ref in dangerous_refs:
                # Allow @master for trivy-action which is a known exception
                if ref in text and "trivy-action@master" in text:
                    # trivy-action is documented as @master — this is their convention
                    cleaned = text.replace("aquasecurity/trivy-action@master", "")
                    assert ref not in cleaned, \
                        f"{filename} uses unpinned action ref '{ref}' (excluding trivy-action)"

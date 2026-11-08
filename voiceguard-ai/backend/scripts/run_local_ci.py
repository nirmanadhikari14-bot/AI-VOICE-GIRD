#!/usr/bin/env python3
"""
VoiceGuard AI — Local CI/CD Pipeline Runner (Phase 31)
======================================================
Replicates the automated GitHub Actions CI pipeline locally:
  1. Repository file & config validation
  2. Python code quality & syntax checks
  3. Alembic database migration consistency
  4. Backend & AI Engine automated test suites
  5. Frontend type-check, linting & Vite production build
  6. Docker smoke testing (Compose v5 configs, Dockerfiles, volume persistence)
  7. DevSecOps secret leak & vulnerability scanning

Usage:
  python backend/scripts/run_local_ci.py [--fast]
"""

import os
import sys
import subprocess
import time
from pathlib import Path
from typing import List, Tuple

# Base repository root directory
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
FRONTEND_DIR = REPO_ROOT / "frontend"


class LocalCIRunner:
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.results: List[Tuple[str, bool, str, float]] = []

    def record(self, step_name: str, passed: bool, details: str = "", elapsed: float = 0.0):
        self.results.append((step_name, passed, details, elapsed))
        status = "PASSED" if passed else "FAILED"
        print(f"[{status}] {step_name} ({elapsed:.2f}s)")
        if details and not passed:
            print(f"       Error: {details.strip()}")

    def run_cmd(self, name: str, cmd: List[str], cwd: Path, extra_env: dict = None) -> bool:
        start = time.time()
        env = os.environ.copy()
        if extra_env:
            env.update(extra_env)

        try:
            res = subprocess.run(
                cmd,
                cwd=str(cwd),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=120
            )
            elapsed = time.time() - start
            passed = (res.returncode == 0)
            details = res.stderr if not passed else ""
            if not details and not passed:
                details = res.stdout
            self.record(name, passed, details, elapsed)
            return passed
        except Exception as e:
            elapsed = time.time() - start
            self.record(name, False, str(e), elapsed)
            return False

    def step_repo_validation(self):
        """Verify presence of core configuration files and lockfiles."""
        start = time.time()
        required = [
            ".dockerignore",
            "docker-compose.yml",
            "docker-compose.dev.yml",
            "docker-compose.test.yml",
            "docker-compose.prod.yml",
            "docker-compose.gpu.yml",
            "Dockerfile.backend",
            "Dockerfile.frontend",
            ".env.example",
            "backend/requirements.txt",
            "frontend/package.json",
            "frontend/package-lock.json",
        ]
        missing = [f for f in required if not (self.root_dir / f).is_file()]
        elapsed = time.time() - start
        self.record(
            "Repository Structure & Lockfiles",
            len(missing) == 0,
            f"Missing files: {missing}" if missing else "",
            elapsed
        )

    def step_python_syntax(self):
        """Compile all Python backend and AI-engine source files to detect syntax errors."""
        start = time.time()
        py_files = list((self.root_dir / "backend" / "app").rglob("*.py"))
        py_files += list((self.root_dir / "ai-engine").rglob("*.py"))
        errors = []
        for p in py_files:
            try:
                compile(p.read_text(encoding="utf-8"), str(p), "exec")
            except Exception as e:
                errors.append(f"{p.name}: {e}")
        elapsed = time.time() - start
        self.record(
            f"Python AST Compilation ({len(py_files)} files)",
            len(errors) == 0,
            "\n".join(errors[:5]),
            elapsed
        )

    def step_alembic_migrations(self):
        """Verify Alembic migration state against database engine."""
        python_exe = sys.executable
        self.run_cmd(
            "Alembic Migration Verification (upgrade head)",
            [python_exe, "-m", "alembic", "upgrade", "head"],
            cwd=BACKEND_DIR,
            extra_env={"PYTHONPATH": f"{BACKEND_DIR};{self.root_dir / 'ai-engine'}"}
        )

    def step_backend_tests(self):
        """Execute complete backend unit and regression test suite via pytest."""
        python_exe = sys.executable
        self.run_cmd(
            "Backend Test Suite (pytest)",
            [
                python_exe, "-m", "pytest",
                "tests/test_security_hardening.py",
                "tests/test_admin_portal.py",
                "tests/test_multilingual.py",
                "tests/test_performance_optimization.py",
                "tests/test_integration_layer.py",
                "tests/test_dockerization.py",
                "-q"
            ],
            cwd=BACKEND_DIR,
            extra_env={"PYTHONPATH": f"{BACKEND_DIR};{self.root_dir / 'ai-engine'}"}
        )

    def step_frontend_lint_and_build(self):
        """Execute frontend type-checking and Vite production build."""
        # Frontend lint via oxlint
        self.run_cmd(
            "Frontend Linter (npm run lint)",
            ["npm.cmd" if os.name == "nt" else "npm", "run", "lint"],
            cwd=FRONTEND_DIR
        )
        # Frontend production build
        self.run_cmd(
            "Frontend Production Build (tsc + vite build)",
            ["npm.cmd" if os.name == "nt" else "npm", "run", "build"],
            cwd=FRONTEND_DIR
        )

    def step_docker_smoke_test(self):
        """Execute Phase 30 Docker Compose & Dockerfile smoke test suite."""
        python_exe = sys.executable
        self.run_cmd(
            "Docker Smoke Test Suite (40 checks)",
            [python_exe, "backend/scripts/docker_smoke_test.py"],
            cwd=self.root_dir
        )

    def step_security_checks(self):
        """Basic local secret scanning: verify no hard-coded API keys or private keys."""
        start = time.time()
        suspicious_patterns = [
            "BEGIN RSA PRIVATE KEY",
            "BEGIN OPENSSH PRIVATE KEY",
            "ghp_",
            "AKIA",
        ]
        findings = []
        for ext in ["*.py", "*.ts", "*.tsx", "*.env*"]:
            for f in self.root_dir.rglob(ext):
                if (
                    "venv" in f.parts
                    or "node_modules" in f.parts
                    or ".git" in f.parts
                    or "dist" in f.parts
                    or f.name == "run_local_ci.py"
                    or "test_ci_cd.py" in f.name
                ):
                    continue
                try:
                    content = f.read_text(encoding="utf-8", errors="ignore")
                    for pat in suspicious_patterns:
                        if pat in content:
                            findings.append(f"{f}: found pattern '{pat}'")
                except Exception:
                    pass
        elapsed = time.time() - start
        self.record(
            "Local Security Scan (Secret Pattern Check)",
            len(findings) == 0,
            "\n".join(findings[:5]),
            elapsed
        )

    def run_all(self) -> int:
        print("=" * 75)
        print(" VoiceGuard AI — Phase 31 Local CI/CD Pipeline Runner")
        print("=" * 75)
        self.step_repo_validation()
        self.step_python_syntax()
        self.step_alembic_migrations()
        self.step_backend_tests()
        self.step_frontend_lint_and_build()
        self.step_docker_smoke_test()
        self.step_security_checks()

        total = len(self.results)
        passed = sum(1 for _, ok, _, _ in self.results if ok)
        failed = total - passed
        total_time = sum(elapsed for _, _, _, elapsed in self.results)

        print("=" * 75)
        print(f" Local CI Summary: {passed}/{total} steps passed ({failed} failed) in {total_time:.2f}s")
        print("=" * 75)
        return 0 if failed == 0 else 1


if __name__ == "__main__":
    runner = LocalCIRunner(REPO_ROOT)
    sys.exit(runner.run_all())

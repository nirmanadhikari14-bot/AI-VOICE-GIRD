# VoiceGuard AI — Automated Testing & CI/CD Docker Guide
## Phase 30: Dockerization (SIH26104)

### 1. Overview
VoiceGuard AI provides an isolated, deterministic automated testing environment via `docker-compose.test.yml`. It runs completely headless, uses ephemeral in-memory `tmpfs` filesystems for maximum database performance, and terminates with an actionable exit code for CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins).

---

### 2. Running Automated Tests Locally in Docker

Execute the full regression test suite inside Docker containers:

```bash
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from test-runner
```

When tests complete:
- If all tests pass, the command exits with code `0`.
- If any test fails, it exits with non-zero, immediately failing CI/CD jobs.

---

### 3. Architecture of the Test Environment

```
               ┌──────────────────────────────────────────┐
               │              test-runner                 │
               │   - Image: voiceguard/backend:test       │
               │   - Command: pytest backend/tests -v     │
               └───────────────┬──────────────────────────┘
                               │
            Isolated Bridge: test-network
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
       ┌──────────────────┐          ┌──────────────────┐
       │     test-db      │          │    test-redis    │
       │  postgres:16     │          │  redis:7-alpine  │
       │  tmpfs storage   │          │  in-memory ping  │
       └──────────────────┘          └──────────────────┘
```

#### Key Characteristics
1. **Ephemeral `tmpfs` Storage:**
   The `test-db` PostgreSQL container mounts `/var/lib/postgresql/data` into memory (`tmpfs: /var/lib/postgresql/data`). Disk I/O bottlenecks are eliminated, allowing hundreds of test transactions to execute in seconds.
2. **Network Isolation:**
   The `test-network` is completely separated from any development or production containers running on the host.
3. **Automatic Tear-Down:**
   Running with `--abort-on-container-exit` ensures that the database and Redis services shut down cleanly the moment `test-runner` finishes.

---

### 4. Running Specific Test Suites

To execute a single test file inside the test container:

```bash
docker-compose -f docker-compose.test.yml run --rm test-runner pytest backend/tests/test_dockerization.py -v
```

To run with coverage reporting:

```bash
docker-compose -f docker-compose.test.yml run --rm test-runner pytest --cov=app --cov=ai-engine backend/tests/
```


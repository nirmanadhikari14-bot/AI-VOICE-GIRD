# VoiceGuard AI — Security Testing Guide
## Phase 25: Security & Privacy Hardening
**SIH Problem Statement: SIH26104**

---

## 1. Overview

This document defines the security test register, automated test suite documentation, pentest scope, finding severity templates, and retest procedures for VoiceGuard AI.

---

## 2. Automated Security Test Suite

**Location:** `backend/tests/test_security_hardening.py`

**Run Command:**
```bash
cd voiceguard-ai/backend
.\venv\Scripts\python.exe tests/test_security_hardening.py
```

### 2.1 Test Register

| Test ID | Test Name | What It Verifies | Expected Result |
|:--------|:----------|:-----------------|:----------------|
| SEC-T01 | `test_tenant_isolation_call_session` | Cross-org Call access attempt → denied | HTTP 403 `TENANT_ISOLATION_VIOLATION` |
| SEC-T02 | `test_tenant_isolation_security_incident` | Cross-org Incident access attempt → denied | HTTP 403 `TENANT_ISOLATION_VIOLATION` |
| SEC-T03 | `test_tenant_isolation_security_alert` | Cross-org Alert access attempt → denied | HTTP 403 `TENANT_ISOLATION_VIOLATION` |
| SEC-T04 | `test_privilege_escalation_prevention` | Regular user executing prevention action → denied | HTTP 403 |
| SEC-T05 | `test_rate_limiting_defense` | 5 consecutive failed logins → lockout | `is_rate_limited()` returns True after 5 failures |
| SEC-T06 | `test_audio_validation_wav_accepted` | Valid WAV magic bytes → accepted | HTTP 200 / returns format "wav" |
| SEC-T07 | `test_audio_validation_malformed_rejected` | MZ executable header → rejected | HTTP 415 Unsupported Media Type |
| SEC-T08 | `test_audio_validation_oversized_chunk` | >1MB audio chunk → rejected | HTTP 413 Content Too Large |
| SEC-T09 | `test_audio_validation_empty_rejected` | Empty bytes → rejected | HTTP 400 Bad Request |
| SEC-T10 | `test_secret_credential_masking` | Secret key not weakly/trivially guessable | `SECRET_KEY` length ≥ 32 bytes |
| SEC-T11 | `test_biometric_privacy_safeguards` | `VoiceProfile` model has no `embedding` in response schema | Embedding field not in API response keys |

### 2.2 Additional Test Suites

| Suite | Run Command | Tests |
|:------|:------------|:------|
| `test_endpoints_direct.py` | `.\venv\Scripts\python.exe tests/test_endpoints_direct.py` | Login, Alerts, Risk, Incidents, Prevention, Active Calls |
| `test_admin_portal.py` | `.\venv\Scripts\python.exe tests/test_admin_portal.py` | Admin RBAC, KPIs, Tenant isolation, User lifecycle (12 tests) |
| Frontend Build | `cd frontend && npm run build` | TypeScript type safety, build integrity, 0 errors |

### 2.3 CI Integration

All three test suites must pass before merging to `main`. Add to CI pipeline (GitHub Actions example):

```yaml
- name: Run Security Tests
  run: |
    cd backend
    python tests/test_security_hardening.py
    python tests/test_endpoints_direct.py
    python tests/test_admin_portal.py

- name: Build Frontend
  run: |
    cd frontend
    npm ci
    npm run build
```

---

## 3. Manual Security Test Cases

### 3.1 Authentication & Session Management

| Case ID | Test Case | Steps | Expected |
|:--------|:----------|:------|:---------|
| MAN-A01 | JWT token expiry enforcement | Issue token, wait for expiry, attempt API call | HTTP 401 |
| MAN-A02 | JWT signature tampering | Modify JWT payload, attempt API call | HTTP 401 |
| MAN-A03 | Login with suspended account | Set `status=suspended`, attempt login | HTTP 403 |
| MAN-A04 | Concurrent session from different IP | Login from IP A, use token from IP B | Token valid (log the anomaly) |
| MAN-A05 | Password reset without current password | Attempt admin-forced reset without auth | HTTP 401/403 |

### 3.2 Authorization & Tenant Isolation

| Case ID | Test Case | Steps | Expected |
|:--------|:----------|:------|:---------|
| MAN-B01 | Org user accessing foreign call | Authenticate as org2 user, GET `/api/v1/calls/{org1_call_id}` | HTTP 403 |
| MAN-B02 | Org user listing all calls | Authenticate as org2 user, GET `/api/v1/calls/active` | Only org2 calls returned |
| MAN-B03 | soc_operator executing prevention | Authenticate as soc_operator, POST `/api/v1/prevention/{id}/execute` | HTTP 403 |
| MAN-B04 | readonly user acknowledging alert | Authenticate as readonly, PATCH `/api/v1/alerts/{id}/acknowledge` | HTTP 403 |
| MAN-B05 | IDOR via prediction ID manipulation | Enumerate prediction/risk IDs for foreign org | HTTP 403 for foreign-org resources |

### 3.3 Input Validation & Injection

| Case ID | Test Case | Steps | Expected |
|:--------|:----------|:------|:---------|
| MAN-C01 | SQL injection in search | Submit `' OR 1=1--` in search query params | HTTP 400 or no injection effect |
| MAN-C02 | XSS in alert notes field | Submit `<script>alert(1)</script>` as incident note | Stored as literal text; not executed |
| MAN-C03 | Path traversal in file uploads | Submit audio upload with path traversal filename | HTTP 400 or sanitized filename |
| MAN-C04 | Malformed JSON body | Submit invalid JSON to any POST endpoint | HTTP 422 Unprocessable Entity |
| MAN-C05 | Negative IDs | Submit `GET /api/v1/calls/-1` | HTTP 404 |
| MAN-C06 | Extremely large payload | Submit >100MB JSON body | HTTP 413 / connection reset |

### 3.4 Audio Pipeline

| Case ID | Test Case | Steps | Expected |
|:--------|:----------|:------|:---------|
| MAN-D01 | ZIP bomb audio | Submit zip bomb as audio upload | HTTP 413 (size limit) or 415 (invalid magic) |
| MAN-D02 | PE/EXE file as audio | Submit Windows executable with `.wav` extension | HTTP 415 Unsupported Media Type |
| MAN-D03 | WebSocket without JWT | Connect to `/ws/v1/audio` without token | WebSocket close code 1008 |
| MAN-D04 | WebSocket with invalid JWT | Connect to `/ws/v1/audio` with expired token | WebSocket close code 1008 |
| MAN-D05 | Chunk flooding | Send 2000 rapid audio chunks via WebSocket | Rate limited or connection throttled |

### 3.5 Security Headers

| Case ID | Test Case | Steps | Expected |
|:--------|:----------|:------|:---------|
| MAN-E01 | Clickjacking | Embed backend URL in `<iframe>` | Blocked by `X-Frame-Options: DENY` |
| MAN-E02 | MIME sniffing | Serve JS as text/plain, check browser execution | `X-Content-Type-Options: nosniff` prevents |
| MAN-E03 | CORS from untrusted origin | Request with `Origin: https://evil.com` | No ACAO header returned |
| MAN-E04 | CSP inline script | Inject inline `<script>` into frontend | Blocked by CSP `script-src 'self'` |

---

## 4. Penetration Test Scope

### 4.1 In-Scope Systems

| System | Technology | Environment |
|:-------|:-----------|:------------|
| Backend API | FastAPI / Python | Staging |
| Frontend Web App | React 19 / TypeScript | Staging |
| Mobile App | React Native | Android Emulator (Staging) |
| Desktop App | Electron / React | Windows Staging |
| Admin Portal | React / TypeScript | Staging |
| WebSocket Stream | Starlette WebSocket | Staging |
| PostgreSQL | v14+ | Staging DB |
| Redis | v6+ | Staging |

### 4.2 Out-of-Scope

- Production database — no live data in pentest
- Third-party AI model inference endpoints (not controlled by VoiceGuard)
- Network infrastructure owned by cloud provider
- Physical hardware

### 4.3 Pentest Methodology

1. **Reconnaissance** — API schema discovery (`/docs`), frontend bundle analysis, Electron IPC inspection.
2. **Authentication Testing** — Brute force (verify rate limiter), token manipulation, logout completeness.
3. **Authorization Testing** — RBAC boundary testing, tenant isolation (IDOR), privilege escalation.
4. **Input Validation** — Injection, XSS, path traversal, malformed media.
5. **Audio Pipeline Security** — File format bypass, size limit bypass, WebSocket hijack.
6. **Security Headers** — OWASP header checklist.
7. **Dependency Analysis** — CVE scan of all dependencies.
8. **Secrets** — Verify no hardcoded credentials, token in logs, sensitive data in error responses.

---

## 5. Finding Template

```markdown
## Finding [YEAR-NNN] — [Short Title]

**Severity:** Critical / High / Medium / Low / Informational
**CVSS Score:** X.X (AV:.../AC:.../PR:.../UI:.../S:.../C:.../I:.../A:...)
**Category:** Injection / Broken Access Control / Misconfiguration / Cryptographic Failure / etc.
**Component:** backend / frontend / mobile / desktop / admin-portal

### Description
[Clear description of the vulnerability]

### Evidence
[Steps to reproduce, request/response samples, screenshots]

### Impact
[What an attacker can do if this is exploited]

### Remediation
[Specific fix recommendation]

### Status
- [ ] Open
- [ ] In Progress
- [ ] Fixed
- [ ] Risk Accepted

### Retest Date
YYYY-MM-DD

### Retester
[Name]

### Retest Result
PASS / FAIL
```

---

## 6. Retest Procedures

1. Assign each finding a unique ID (e.g., `2026-001`).
2. Developer applies fix and links to git commit in finding record.
3. Original tester or designated security engineer performs retest within **5 business days** of fix.
4. Retest repeats the exact reproduction steps from the finding.
5. Record retest result (PASS/FAIL) in finding record.
6. All P1 and P2 findings must PASS retest before deployment.
7. P3/P4 findings: document risk acceptance if not fixed before deadline.

---

## 7. Security Test Results — Phase 25

**Date Run:** Phase 25 Implementation

### Automated Test Results

```
tests/test_security_hardening.py
═══════════════════════════════════════════════════════════════
✅ PASS  SEC-T01: Tenant isolation — Call Session (HTTP 403)
✅ PASS  SEC-T02: Tenant isolation — Security Incident (HTTP 403)
✅ PASS  SEC-T03: Tenant isolation — Security Alert (HTTP 403)
✅ PASS  SEC-T04: Privilege escalation — Prevention Action (HTTP 403)
✅ PASS  SEC-T05: Rate limiting — Lockout at 5 failures
✅ PASS  SEC-T06: Audio validation — WAV accepted
✅ PASS  SEC-T07: Audio validation — MZ binary rejected (HTTP 415)
✅ PASS  SEC-T08: Audio validation — >1MB chunk rejected (HTTP 413)
✅ PASS  SEC-T09: Audio validation — Empty chunk rejected (HTTP 400)
✅ PASS  SEC-T10: Secret credential masking verified
✅ PASS  SEC-T11: Biometric privacy — raw embedding not exposed

tests/test_endpoints_direct.py:  ALL PASSED
tests/test_admin_portal.py:      ALL 12 PASSED

Frontend build:                  0 errors, 2434 modules ✅
═══════════════════════════════════════════════════════════════
TOTAL: 11/11 security tests PASSING
```

---

*Document Owner: Security Engineering Team | Review Cycle: Per Release | Last Reviewed: Phase 25*


# VoiceGuard AI — Incident Response Procedures
## Phase 25: Security & Privacy Hardening
**SIH Problem Statement: SIH26104**

---

## 1. Purpose and Scope

This document defines the structured response procedures for security incidents involving the VoiceGuard AI platform. It covers:

- Voice cloning impersonation attacks detected in real time.
- Unauthorized access and authentication breaches.
- Tenant isolation violations.
- Data exfiltration events.
- AI model poisoning or adversarial input attacks.
- Infrastructure and availability incidents.

All personnel with access to VoiceGuard AI systems are bound by these procedures.

---

## 2. Incident Severity Classification

| Severity | Criteria | SLA (Response) | SLA (Resolution) |
|:---------|:---------|:---------------|:-----------------|
| **P1 — Critical** | Active voice cloning attack in progress; confirmed financial fraud; data breach with PII/biometric exposure; complete platform outage | 15 minutes | 4 hours |
| **P2 — High** | Suspected voice cloning; failed authentication spike (>50 failures/hr); tenant isolation violation detected; partial service degradation | 1 hour | 24 hours |
| **P3 — Medium** | Anomalous risk score patterns; unusual API access patterns; non-critical component failure | 4 hours | 72 hours |
| **P4 — Low** | Policy drift; minor configuration anomalies; informational audit findings | 24 hours | 2 weeks |

---

## 3. Incident Response Lifecycle

```
Detection → Triage → Containment → Eradication → Recovery → Post-Incident Review
```

### 3.1 Detection Sources

- **Automated**: VoiceGuard AI risk engine (voice score ≥ 80), WebSocket stream anomaly detection, rate limiter lockout events, tenant isolation violation logs.
- **Manual**: SOC analyst observation via Windows Security Console, user-reported suspicious calls via Mobile App, helpdesk escalation.
- **External**: CERT advisories, threat intelligence feeds, law enforcement notification.

### 3.2 Triage

Upon detection, the on-call analyst must within **15 minutes**:

1. Confirm the incident is real (not a false positive).
2. Assign a severity level (P1–P4).
3. Open an incident record in the VoiceGuard AI Incident Management system (POST `/api/v1/incidents`).
4. Notify the designated incident commander.

```
Incident Record Minimum Fields:
- incident_type: "voice_cloning_attack" | "unauthorized_access" | "data_breach" | "tenant_violation" | "platform_outage"
- severity: "critical" | "high" | "medium" | "low"
- affected_organization_id: <int>
- initial_description: <string>
- detection_source: "automated" | "manual" | "external"
```

### 3.3 Escalation Matrix

| Severity | Primary | Secondary | Executive |
|:---------|:--------|:----------|:----------|
| P1 | On-call SOC Analyst | Security Lead | CISO + CTO (immediate) |
| P2 | On-call SOC Analyst | Security Lead | CISO (within 1 hr) |
| P3 | Assigned Analyst | Security Lead | — |
| P4 | Assigned Analyst | — | — |

---

## 4. Voice Cloning Attack Response

### 4.1 Active Attack (P1)

**Immediate Actions (T+0 to T+15 min):**

1. Confirm `risk_level = critical` and `voice_score ≥ 80` in the VoiceGuard backend.
2. Execute prevention action via API:
   ```
   POST /api/v1/prevention/{action_id}/execute
   Authorization: Bearer <analyst_token>
   ```
3. Terminate suspicious call session:
   ```
   POST /api/v1/calls/{call_id}/terminate
   ```
4. Alert affected organization's security contact via out-of-band channel (SMS, email).
5. Freeze any pending financial transactions associated with the call (coordinate with client's fraud team).

**Short-Term Actions (T+15 min to T+4 hr):**

6. Preserve evidence: capture audio stream artifacts, risk score breakdown, analysis results, speaker verification logs.
7. Initiate forensic review of all calls in the same session window from the same caller number.
8. Check threat intelligence for known voice cloning infrastructure (STIR/SHAKEN violation patterns).
9. Generate formal incident report in the Admin Portal.

**Evidence Preservation Checklist:**
- [ ] Call ID and session metadata exported
- [ ] Risk score JSON snapshot saved
- [ ] Audio chunks hashed and archived (SHA-256)
- [ ] Analysis result features captured
- [ ] Speaker verification log saved
- [ ] Prevention action log captured
- [ ] Rate limiter and auth log excerpts saved
- [ ] Correlation IDs from `X-Correlation-ID` headers captured

### 4.2 Suspected Attack (P2)

1. Flag the alert: `PATCH /api/v1/alerts/{alert_id}/acknowledge`
2. Request secondary verification: `POST /api/v1/verification/request`
3. Monitor additional calls from same originating number for 30 minutes.
4. Escalate to P1 if voice score increases or secondary verification fails.

---

## 5. Authentication Breach Response

### 5.1 Brute Force / Credential Stuffing

**Signs:** Rate limiter lockout events in logs, spike in 401/429 responses, multiple failed logins from single IP.

**Response:**
1. Confirm lockout active (rate limiter engaged at 5 failures).
2. Identify source IP from `X-Forwarded-For` or `client.host` logs.
3. Add IP to WAF block list (infrastructure team).
4. Audit successful logins from that IP in the past 24 hours.
5. Force password reset for any accounts that had successful login from the blocked IP.
6. Review for credential dump correlation (check HaveIBeenPwned API or equivalent).

### 5.2 JWT Token Compromise

**Signs:** Token reuse from unexpected geolocation, concurrent sessions from conflicting IPs.

**Response:**
1. Invalidate user's active JWT (update `is_active = False`, then restore after password reset).
2. Force logout on all sessions.
3. Require MFA re-enrollment.

---

## 6. Tenant Isolation Violation Response

**Detection:** Log entry containing `TENANT_ISOLATION_VIOLATION` from `security_hardening.py`.

**Response (P2):**
1. Identify the offending user account and their organization.
2. Suspend the user account immediately: `PATCH /api/v1/admin/users/{id}/status → suspended`.
3. Audit all API requests from this user in the past 24 hours (audit log query).
4. Determine if unauthorized data was accessed or exfiltrated.
5. Notify the affected foreign organization's security contact.
6. Conduct code review to determine if violation was a bug or intentional bypass.
7. If intentional: escalate to P1, preserve forensic evidence, notify legal team.

---

## 7. Data Breach Response

**P1 — Biometric/PII Exposure:**

1. **Contain** — Revoke API keys and tokens associated with the breach vector immediately.
2. **Assess Scope** — Determine which records were accessed (voice profiles, embeddings, call logs, PII).
3. **Notify** — Per applicable regulations (DPDP Act 2023 / GDPR equivalent): notify affected individuals within 72 hours.
4. **Preserve** — Archive all logs with cryptographic hash (do not alter or delete).
5. **Remediate** — Patch the vulnerability; rotate all secrets (`SECRET_KEY`, DB credentials, API keys).
6. **Report** — File regulatory notification with relevant authority.

> [!CAUTION]
> Raw biometric embeddings (512-d speaker vectors) are classified as **Biometric Data** under DPDP Act 2023 and are subject to strict breach notification requirements. The VoiceGuard backend MUST NOT expose raw embeddings via API — verified by `test_biometric_privacy_safeguards` in `tests/test_security_hardening.py`.

---

## 8. Post-Incident Review

All P1 and P2 incidents require a Post-Incident Review (PIR) within **5 business days**.

### PIR Template

```markdown
## Post-Incident Review — [Incident ID]

**Date:** YYYY-MM-DD
**Severity:** P1/P2
**Duration:** [Detection Time] → [Resolution Time]
**Incident Commander:**

### Timeline
| Time | Event |
|:-----|:------|
| T+0  | Detection |
| T+X  | Containment |
| T+X  | Resolution |

### Root Cause
[Describe the technical root cause]

### Contributing Factors
- [Factor 1]
- [Factor 2]

### Impact
- Organizations affected:
- Records potentially exposed:
- Financial impact (if applicable):

### Remediation Actions Taken
- [Action 1 — Owner — Date]
- [Action 2 — Owner — Date]

### Prevention Measures
- [Control 1]
- [Control 2]

### Lessons Learned
[Key takeaways for future incidents]
```

---

## 9. Contact Directory

| Role | Contact Method | Availability |
|:-----|:---------------|:-------------|
| On-Call SOC Analyst | PagerDuty rotation | 24/7 |
| Security Lead | Direct + PagerDuty | 24/7 for P1 |
| CISO | Direct + Email | Business hours + P1 24/7 |
| Legal / Compliance | Email | Business hours |
| Affected Organization Security Contact | Stored in Admin Portal → Organization Settings | As configured |

> [!IMPORTANT]
> Contact information must be maintained in the Admin Portal. Outdated contacts are a P3 operational risk.

---

*Document Owner: Security Engineering Team | Review Cycle: Quarterly | Last Reviewed: Phase 25*


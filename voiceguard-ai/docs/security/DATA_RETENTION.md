# VoiceGuard AI — Data Retention Policy
## Phase 25: Security & Privacy Hardening
**SIH Problem Statement: SIH26104**

---

## 1. Purpose

This document defines the data retention schedules, deletion procedures, legal hold protocols, and verification requirements for all data categories processed by VoiceGuard AI. It is designed to support compliance with:

- **DPDP Act 2023** (Digital Personal Data Protection Act, India)
- **IT Act 2000** (Information Technology Act, India)
- General enterprise data governance requirements for financial institution deployments.

---

## 2. Data Classification and Retention Schedule

| Data Category | Classification | Retention Period | Basis | Deletion Method |
|:--------------|:---------------|:-----------------|:------|:----------------|
| **Raw audio recordings** (call stream buffers) | Biometric / Sensitive | 90 days | Minimum for fraud investigation; longer with legal hold | Secure overwrite (DoD 5220.22-M) |
| **Voice biometric embeddings** (512-d speaker vectors) | Biometric — Restricted | 365 days from last verification | Biometric profiling consent | Cryptographic erasure + secure delete |
| **Voice profiles** (enrollment metadata) | Sensitive | Duration of consent + 30 days | Consent-based | Secure delete |
| **Call session metadata** (caller ID, timestamps, duration) | Confidential | 365 days | Fraud investigation, legal obligation | Standard delete + audit trail |
| **Risk scores and analysis results** | Confidential | 365 days | Fraud investigation, model auditing | Standard delete |
| **Security alerts** | Confidential | 730 days (2 years) | Incident investigation, compliance | Standard delete |
| **Security incidents** | Confidential | 1825 days (5 years) | Legal, regulatory, litigation hold | Standard delete |
| **Prevention action logs** | Confidential | 1825 days (5 years) | Legal, regulatory | Standard delete |
| **Audit logs** | Confidential | 2555 days (7 years) | Legal minimum; financial regulations | Immutable archive |
| **User account data** (name, email, role) | Personal | Duration of account + 90 days | Contract/service delivery | Standard delete |
| **Authentication logs** (login events, token activity) | Confidential | 365 days | Security monitoring | Standard delete |
| **Device registrations** | Personal | Duration of registration + 30 days | Consent | Standard delete |
| **Verification logs** | Confidential | 730 days | Fraud investigation | Standard delete |
| **Threat intelligence data** | Internal | 365 days | Operational | Standard delete |

> [!NOTE]
> Default values are configured via environment variables (`AUDIO_RETENTION_DAYS`, `ALERT_RETENTION_DAYS`, etc. in `.env.example`). Administrators can modify these per organization through the Admin Portal → Security Policies.

---

## 3. Legal Hold

When a security incident escalates to litigation, regulatory investigation, or law enforcement request:

1. The `is_legal_hold` flag must be set on affected `Incident` records.
2. Automated deletion jobs **must skip** any records linked to an active legal hold.
3. Legal hold is set/released exclusively by users with `superadmin` or `admin` role.
4. Legal hold events are recorded in the Audit Log with timestamp and authorizing user.
5. Maximum legal hold duration: 7 years (after which manual review is required).

```sql
-- Example: Apply legal hold to an incident and its linked data
UPDATE incidents SET is_legal_hold = TRUE WHERE id = :incident_id;
-- Deletion job checks: WHERE is_legal_hold IS NOT TRUE
```

---

## 4. Biometric Data Handling

Raw voice embeddings and biometric templates require heightened controls under DPDP Act 2023:

### 4.1 Consent Requirements

- **Explicit, informed, granular consent** must be obtained before enrolling a voice profile.
- Consent records must be stored with: timestamp, consent version, consenting user ID, and scope.
- Consent can be withdrawn at any time via the Mobile App or Admin Portal.
- Upon withdrawal: biometric data deleted within **30 days**; audit trail retained.

### 4.2 API Exposure Prohibition

Raw biometric embeddings (512-dimensional speaker vectors) **must never** be returned via any API response. This is enforced by:

1. `VerificationLog` and `VoiceProfile` models do not serialize the `embedding` field in any API response schema.
2. `tests/test_security_hardening.py → test_biometric_privacy_safeguards()` verifies this at every CI run.

### 4.3 Storage

- Biometric templates stored in the database must be encrypted at rest (AES-256 minimum).
- In production (PostgreSQL), enable Transparent Data Encryption (TDE) or column-level encryption.
- Access to the `voice_profiles` table must be audited.

---

## 5. Deletion Procedures

### 5.1 Scheduled Automated Deletion

A retention sweep must run **daily** (recommended: 02:00 UTC) and delete records past their retention period. Implementation:

```python
# Example: Scheduled deletion job (to be run as a Celery/APScheduler task in production)
from datetime import datetime, timedelta
from app.models.domain import Alert, Incident, AuditLog

def run_retention_sweep(db: Session):
    cutoff_alerts = datetime.utcnow() - timedelta(days=730)
    db.query(Alert).filter(
        Alert.created_at < cutoff_alerts,
        Alert.is_legal_hold.isnot(True)  # Skip legal holds
    ).delete(synchronize_session=False)

    cutoff_incidents = datetime.utcnow() - timedelta(days=1825)
    db.query(Incident).filter(
        Incident.created_at < cutoff_incidents,
        Incident.is_legal_hold.isnot(True)
    ).delete(synchronize_session=False)

    db.commit()
```

> [!WARNING]
> Audit logs are **never** auto-deleted. They must be archived to immutable storage (e.g., write-once S3 bucket with object lock, or WORM storage) after 90 days.

### 5.2 On-Demand Deletion (Right to Erasure)

When a user submits a Right to Erasure request:

1. Locate all records associated with the user (user ID, email, device IDs).
2. Delete or anonymize: name, email → anonymized; voice embeddings → deleted.
3. Retain: audit log entries (anonymized), incident records required by law (legal hold or statutory minimum).
4. Issue deletion certificate to the user within **30 days**.

### 5.3 Deletion Verification

After each deletion job:

1. Run a verification query confirming no records outside retention period remain (excluding legal holds).
2. Log verification result to Audit Log.
3. Alert on deletion failures.

---

## 6. Data Residency

| Data Type | Permitted Residency |
|:----------|:-------------------|
| Voice embeddings | Within India (for DPDP compliance) or jurisdiction specified in client contract |
| Call metadata | Within India or contractual jurisdiction |
| Audit logs | Within India or contractual jurisdiction |
| Platform configuration | Within India or contractual jurisdiction |

In cloud deployments, configure database and object storage regions accordingly. Do not replicate biometric data across jurisdictions without explicit consent.

---

## 7. Retention Configuration in Admin Portal

Administrators can adjust retention periods per organization via:

**Admin Portal → Organizations → [Org Name] → Security Policy → Data Retention**

Fields:
- Audio retention (days)
- Call log retention (days)
- Alert retention (days)
- Incident retention (days)
- Audit log retention (days) — Minimum: 730 days

Changes to retention settings are recorded in the Audit Log.

---

*Document Owner: Security & Privacy Engineering Team | Review Cycle: Annually + After Regulatory Changes | Last Reviewed: Phase 25*


# VoiceGuard AI — Biometric Privacy & Data Classification Inventory
**Project:** VoiceGuard AI (SIH26104)  
**Compliance Standards:** GDPR (Art 9), CCPA/CPRA, Illinois BIPA, HIPAA  
**Classification:** Confidential

---

## 1. Data Classification Tiers

| Classification | Description | Examples | Handling Requirements |
|:---|:---|:---|:---|
| **Tier 1: Sensitive Biometric Data** | Physiological or behavioral voice characteristics from which an individual can be uniquely identified. | 512-dimensional voice embeddings, d-vector speaker weights, acoustic spectrograms. | Encrypted at rest (AES-256), excluded from APIs, isolated per tenant, explicit written consent required. |
| **Tier 2: Restricted Telephony & Audio Data** | Real-time audio recordings, raw call buffers, and acoustic feature representations. | Inbound audio streams, PCM chunks, call audio recordings. | Short-lived buffering, auto-deleted per retention window (default 30 days), access logged in immutable audit trail. |
| **Tier 3: Confidential PII & Metadata** | Identifiers associated with calls, users, and transactions. | Caller phone numbers, employee names, email addresses, IP addresses, geolocation. | Role-restricted access, masked in general logs, tenant-isolated. |
| **Tier 4: Internal Security Telemetry** | Algorithmic risk scores, alert metrics, model inference latencies. | Synthetic voice probability, prosody anomaly scores, risk breakdown. | Available to authorized SOC analysts and security administrators. |
| **Tier 5: Public** | System operational health status, API versioning. | `/api/v1/health`, OpenAPI documentation. | Publicly queryable. |

---

## 2. Biometric Consent & Life Cycle Management

In compliance with BIPA and GDPR Art. 9:
1. **Explicit Consent**: Prior to speaker baseline enrollment, the platform verifies and records explicit consent (`consent_recorded: True`).
2. **Right to Erasure (Revocation)**:
   - When a speaker profile is revoked (`POST /api/v1/admin/voice-profiles/{id}/revoke`), all associated `VoiceEmbedding` vectors are immediately purged from database storage and index caches.
   - Deletion events are permanently logged in the audit trail.
3. **No Secondary Use**: Biometric voice models are utilized exclusively for impersonation prevention and authentication defense; vectors are never shared, sold, or used for advertising.


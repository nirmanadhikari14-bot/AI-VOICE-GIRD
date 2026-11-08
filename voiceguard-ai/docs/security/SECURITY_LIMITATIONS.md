# VoiceGuard AI — Security Limitations & Operational Boundaries
## Phase 33: Production Validation (SIH26104)

---

## 1. Residual Risks & Accepted Constraints

While the VoiceGuard AI platform meets stringent Smart India Hackathon security criteria, several operational realities and design decisions are documented below:

| Area | Nature of Constraint | Mitigation & Operational Recommendation |
|---|---|---|
| **In-Memory Token Revocation Store** | In multi-replica deployments without sticky sessions, an in-memory revocation blacklist is local to the container instance. | In clustered production deployments, configure Redis as the centralized token revocation backing store (`vg:revoked:{jti}`). |
| **Acoustic Adversarial Attacks** | Highly sophisticated physical-room adversarial perturbation attacks (over-the-air acoustic noise) may degrade feature extraction confidence. | Use multi-modal defense (Prosody + Deep Vocoder Artifact Analysis + Conversational Social Engineering signals) rather than relying exclusively on a single acoustic model. |
| **Real Device Mobile Biometric Hardware** | Mobile app tests were validated via source-code inspection and Jest unit/integration tests against simulated secure storage. | Prior to enterprise production deployment, conduct on-device testing on physical iOS (Secure Enclave) and Android (StrongBox Keymaster) hardware. |
| **Carrier SIP Integration Execution** | Carrier-level SIP call termination in demo/staging environments runs against a verified mock provider (`carrier_mock`). | Real telco SIP trunk integration requires authenticated carrier TLS certificates and IP allowlists provisioned out-of-band with telecom operators. |

---

## 2. Security Runbook for Operators

1. **Daily Log Review**: Monitor Prometheus alerts (`UnauthorizedAccessSpike`, `BruteForceLockoutActive`).
2. **Secret Rotation**: Rotate `SECRET_KEY` and database passwords every 90 days.
3. **Biometric Data Purging**: Enforce data retention schedules (`POST /api/v1/admin/retention/execute`) to ensure expired acoustic recordings are purged according to tenant consent agreements.


# VoiceGuard AI — Threat Model (STRIDE Methodology)
**Project:** VoiceGuard AI (SIH26104)  
**Methodology:** Microsoft STRIDE Threat Modeling Framework  
**Scope:** Complete End-to-End Voice Impersonation Detection Platform

---

## 1. System Scope & Threat Actors

### Threat Actors:
1. **External Impersonator / Adversary**: Criminal actors employing generative AI voice cloning (TTS/vocoders) to impersonate corporate officers or family members.
2. **Malicious Tenant / Insider**: An authenticated user of Organization A attempting to view or modify confidential calls, voice profiles, or security alerts of Organization B.
3. **Compromised Endpoint**: A compromised mobile device or desktop workstation attempting to stream malicious binaries, overflow audio buffers, or inject false telemetries.
4. **Untrusted Network Observer**: Attackers eavesdropping or performing man-in-the-middle attacks on network traffic.

---

## 2. STRIDE Analysis & Threat Mitigations

| Threat Category | Threat Scenario | Impact | Applied Security Mitigation |
|:---|:---|:---|:---|
| **Spoofing** | Adversary replaying stolen JWT tokens or attempting credential stuffing against `/api/v1/auth/login`. | Unauthorized access to security dashboard. | Sliding-window `InMemoryRateLimiter` locks out clients after 5 failed attempts; short 30-min token expiration; password hashed with bcrypt and unique salt. |
| **Spoofing** | Attacker connecting unauthenticated WebSocket clients to `/ws/v1/audio` to spoof carrier feeds. | Ingestion of fraudulent audio telemetry. | `authenticate_websocket()` validates JWT token before connection acceptance; closes unauthenticated sockets with code 1008 (Policy Violation). |
| **Tampering** | Attacker uploading executable binary disguised as a `.wav` file to exploit audio parser. | Remote code execution or parser crash. | `AudioSecurityValidator` inspects raw magic bytes (`RIFF....WAVE`, `fLaC`, `OggS`, `ID3`); rejects non-audio headers with HTTP 415. |
| **Tampering** | In-flight tampering of prevention action decisions or risk parameters. | Unauthorized call drops or policy bypass. | Parameterized SQLAlchemy models, strict Pydantic schemas, and server-side execution audit logs. |
| **Repudiation** | Analyst denies initiating a call termination or changing enterprise risk thresholds. | Inability to establish forensic accountability. | Immutable `admin_audit_logs` record admin email, IP address, resource ID, action, and structured delta payload. |
| **Information Disclosure** | Cross-tenant querying of confidential audio, risk scores, or incident files (IDOR). | Breach of financial/healthcare caller privacy across tenants. | `enforce_tenant_boundary` verifies that caller's `organization_id` strictly matches the resource's `organization_id`. Violations raise HTTP 403. |
| **Information Disclosure** | Extraction of 512-dimensional biometric voice vectors through administrative APIs. | Violation of GDPR/BIPA biometric privacy regulations. | Biometric vector arrays (`VoiceEmbedding.embedding`) are excluded from `VoiceProfileAdminResponse`. Only confidence score and metadata are returned. |
| **Information Disclosure** | Accidental exposure of third-party telephony tokens (Twilio/Telnyx) via API responses. | Third-party carrier compromise. | Storage and presentation mask secrets (`••••••••••••••••`), revealing only a truncated non-sensitive prefix/suffix. |
| **Denial of Service** | Flooding WebSocket audio streams with multi-megabyte binary chunks to cause OOM crash. | Audio processing service outage. | `AudioSecurityValidator.validate_audio_chunk()` enforces strict 1MB maximum frame size; raises HTTP 413. |
| **Elevation of Privilege** | Read-only analyst or tenant admin executing platform-wide setting changes or terminating SIP calls. | Unauthorized business disruption and privilege escalation. | Role checks in `prevention.py` require elevated privileges (`security_admin`, `org_admin`); cross-tenant modifications blocked with HTTP 403. |

---

## 3. Residual Risks & Ongoing Monitoring

1. **Adversarial Acoustic Perturbations**: Attackers might apply imperceptible adversarial noise to synthetic speech to trick acoustic conformers.
   - *Mitigation*: Multi-modal fusion (prosody, acoustic spectrum, caller reputation, conversation context) ensures detection does not rely on a single acoustic model.
2. **Local Development SQLite Locks**: In high-concurrency production deployments, PostgreSQL with row-level security (RLS) is recommended.


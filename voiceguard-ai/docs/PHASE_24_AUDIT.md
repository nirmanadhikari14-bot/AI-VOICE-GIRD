# Phase 24 — Admin Portal: Mandatory Repository Audit
**Project:** VoiceGuard AI (SIH Problem Statement: SIH26104)  
**Date:** 2026-10-31  

---

## 1. Executive Summary & Monorepo Structure

VoiceGuard AI is a multi-tier cyber-defense platform designed for real-time detection and prevention of AI voice cloning attacks. The monorepo consists of:

- **`backend/`**: FastAPI application running with SQLAlchemy on SQLite (`voiceguard.db`), OAuth2 password bearer tokens, and versioned REST endpoints (`/api/v1/*`).
- **`frontend/`**: Web application using React 19, TypeScript, Vite, TailwindCSS v4, React Router v7, Lucide Icons, and Recharts. Currently implements SOC Operations pages (`/`, `/live`, `/investigation`, `/prevention`) with placeholder routes for speaker profiles, settings, and database.
- **`desktop/`**: Phase 23 Windows Security Console (Electron 34 + React 19 + TypeScript + Vite) providing SOC desktop monitoring.
- **`mobile/`**: Phase 22 React Native application for user notifications and out-of-band verification.
- **`ai-engine/`, `audio-engine/`, `conversation-engine/`, `speaker-engine/`, `risk-engine/`**: Domain engines for acoustic feature extraction, neural vocoder analysis, speaker embeddings, and multi-modal risk scoring.

---

## 2. Existing Authentication & Authorization Architecture

- **Authentication**: JWT Bearer tokens issued via `POST /api/v1/auth/login` (username=email, password).
- **Session Validation**: `GET /api/v1/auth/me` verifies tokens and returns `{ id, email, name, role_id, status }`.
- **Existing Roles**: `Role` model with `name` (e.g. `admin`, `analyst`, `user`).
- **Authorization Gap**: Authorization was previously coarse-grained (`role_id` check only). Fine-grained permissions (`users.read`, `organizations.manage`, `policies.manage`, `audit.read`, etc.), permission-to-role mappings, and multi-tenant organization isolation (`organization_id`) are missing from the schema and must be added.

---

## 3. Existing Database Schema vs. Phase 24 Requirements

### Existing Models (`backend/app/models/domain.py`):
- `User`, `Role`
- `Call`, `CallMetadata`, `Speaker`, `VoiceProfile`, `VoiceEmbedding`, `AnalysisResult`
- `RiskScore`, `Alert`, `Transaction`, `ThreatIndicator`, `VerificationLog`
- `Policy`, `AuditLog`, `Incident`, `IncidentNote`, `PreventionAction`, `DeviceRegistration`, `SuspiciousReport`

### Required New Models & Field Extensions:
1. **`Organization`**:
   - `id`, `name`, `org_type` (enterprise, financial, government, healthcare), `status` (pending, active, suspended, inactive, archived)
   - `contact_email`, `contact_phone`, `primary_admin_id`, `plan_tier`, `settings_json`, timestamps.
2. **`User.organization_id`**: Foreign key linking users to organizations for tenant isolation.
3. **`Permission`**:
   - `id`, `code` (`users.read`, `organizations.manage`, etc.), `name`, `category`, `description`.
4. **`RolePermission`**:
   - `id`, `role_id`, `permission_id` for RBAC mapping.
5. **`IntegrationConfig`**:
   - Provider configurations (telephony, SMS, push, email, threat feeds) with masked secrets (`sk-live-••••••••`).
6. **`RetentionPolicy`**:
   - Data retention periods per category, legal hold flags, and deletion policy definitions.
7. **`ModelServiceConfig`**:
   - AI service inventory (synthetic voice detector, ECAPA-TDNN, prosody analyzer, risk engine) with versions, deployment status, and latency.
8. **`SystemConfig`**:
   - Platform-wide configurations with categories (general, security, auth, monitoring).

---

## 4. Administrative Module Architecture Plan

### Backend Modular Structure:
`backend/app/modules/admin/`:
- `__init__.py`
- `router.py`: Composite admin router mounted at `/api/v1/admin` in `app/main.py`.
- `schemas.py`: Pydantic V2 schemas for all administrative requests and responses.
- `permissions.py`: Fine-grained permission codes and FastAPI dependency guards enforcing tenant boundaries.
- `organization_service.py`: Organization tenant lifecycle and metadata management.
- `user_service.py`: Admin user creation, profile update, role assignment, account activation/suspension.
- `role_service.py`: Role and permission matrix management.
- `policy_service.py`: Security policy versions, thresholds, activation/deactivation.
- `device_service.py`: Organization device registry and revocation.
- `integration_service.py`: External provider configuration, credential masking, connection health probe.
- `retention_service.py`: Data category retention rules and legal hold management.
- `audit_service.py`: Immutable administrative audit logs with filtering and export.
- `system_service.py`: System configuration, AI model deployment inventory, and platform overview KPIs.

### Frontend Admin Portal Structure:
`frontend/src/features/admin/`:
- `AdminLayout.tsx`: Administrative layout shell with sidebar, topbar, and organization context switcher.
- `AdminContext.tsx`: Selected organization scope, current permissions, and active admin role.
- `api/adminApi.ts`: Centralized client for all `/api/v1/admin/*` endpoints.
- `pages/`:
  - `AdminDashboard.tsx`: Platform & organization overview metrics, status distribution, system health summary.
  - `OrganizationManagement.tsx`: Tenant list, organization creation, status toggle (Active/Suspended), plan management.
  - `UserManagement.tsx`: User list, user invite/create, role assignment, account suspension, tenant filtering.
  - `RoleManagement.tsx`: Role catalog, permission matrix, custom role assignment.
  - `PolicyManagement.tsx`: Security policy rules, risk/prevention thresholds, policy activation.
  - `VoiceProfileAdmin.tsx`: Privacy-safe voice enrollment records, speaker verification status, consent logs.
  - `DeviceManagement.tsx`: Registered mobile and desktop devices, revocation controls.
  - `IntegrationManagement.tsx`: Provider integrations (SIP, Twilio, SendGrid, FCM, Threat Feeds) with connection test.
  - `NotificationAdmin.tsx`: Notification channel configuration, provider status, delivery telemetry.
  - `AiServiceVisibility.tsx`: AI models catalog (vocoder, embeddings, prosody, risk engine), latency, version history.
  - `DataRetentionAdmin.tsx`: Retention periods per data category, legal hold switches, archival policies.
  - `AuditLogAdmin.tsx`: Immutable admin audit trail, actor/action filters, CSV export.
  - `AdminReports.tsx`: Multi-dimensional administrative reporting (activity, alerts, incidents, devices) with export.
  - `SystemHealthAdmin.tsx`: Subsystem diagnostics, latency metrics, service availability checks.
  - `PlatformSettings.tsx`: Security settings, session lifetimes, general platform configuration.

---

## 5. Security & Isolation Controls

1. **Server-Side Tenant Boundaries**: All organization queries filter strictly on the requesting administrator's `organization_id` unless the user holds `superadmin` / `platform_admin` role.
2. **Secret Redaction**: API keys and tokens are never returned in cleartext; secrets are stored encrypted/masked (`••••••••abcd`) in the database.
3. **Biometric Privacy**: Raw voice embeddings are never transmitted to or displayed on the admin portal frontend; only enrollment status, verification score, and consent flags are exposed.
4. **Privilege Escalation Prevention**: Administrators cannot grant roles or permissions higher than their own assigned authority.
5. **Auditing**: Every administrative write operation (create, update, suspend, revoke, policy change) automatically commits an immutable record into `audit_logs`.


# VoiceGuard AI — Access Control & RBAC Matrix
## Phase 25: Security & Privacy Hardening
**SIH Problem Statement: SIH26104**

---

## 1. Overview

VoiceGuard AI implements **Role-Based Access Control (RBAC)** with multi-tenant isolation. Every API endpoint enforces authorization server-side through `app/api/deps.py` and `app/core/security_hardening.py`. Frontend UI permissions are supplementary and never a substitute for backend enforcement.

---

## 2. Role Definitions

| Role Name | Scope | Description |
|:----------|:------|:------------|
| `superadmin` | Platform-wide | Full access to all organizations, all data, all configurations. Can create/delete organizations and assign any role. |
| `admin` | Platform-wide | Platform administration. Can manage organizations, users, system configuration. Cannot access raw biometric embeddings. |
| `org_admin` | Own organization | Can manage users and settings within their organization. Tenant-scoped. |
| `security_analyst` | Own organization | Can view all security data, acknowledge alerts, review incidents, assign cases. Cannot execute prevention actions. |
| `fraud_investigator` | Own organization | Can investigate calls, view risk explanations, review evidence. Read-heavy role. |
| `soc_operator` | Own organization | Real-time monitoring, alert acknowledgment, basic incident creation. Cannot approve prevention actions. |
| `user` | Own account | Can view their own security status, complete verification workflows, report suspicious calls. |
| `readonly` | Own organization | View-only access to security dashboard, alerts, incidents. No write operations. |

---

## 3. Permission Matrix

### 3.1 Authentication & Session

| Permission | superadmin | admin | org_admin | security_analyst | fraud_investigator | soc_operator | user | readonly |
|:-----------|:----------:|:-----:|:---------:|:----------------:|:-----------------:|:------------:|:----:|:--------:|
| Login | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Logout | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View own profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Change own password | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 3.2 User Management

| Permission | superadmin | admin | org_admin | security_analyst | fraud_investigator | soc_operator | user | readonly |
|:-----------|:----------:|:-----:|:---------:|:----------------:|:-----------------:|:------------:|:----:|:--------:|
| List all users (platform) | ✓ | ✓ | — | — | — | — | — | — |
| List org users | ✓ | ✓ | ✓ | — | — | — | — | — |
| Create user | ✓ | ✓ | ✓(org) | — | — | — | — | — |
| Suspend/activate user | ✓ | ✓ | ✓(org) | — | — | — | — | — |
| Delete user | ✓ | ✓ | — | — | — | — | — | — |
| Assign roles | ✓ | ✓ | ✓(org, ≤org_admin) | — | — | — | — | — |

### 3.3 Organization Management

| Permission | superadmin | admin | org_admin | security_analyst | fraud_investigator | soc_operator | user | readonly |
|:-----------|:----------:|:-----:|:---------:|:----------------:|:-----------------:|:------------:|:----:|:--------:|
| List all organizations | ✓ | ✓ | — | — | — | — | — | — |
| View own organization | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create organization | ✓ | ✓ | — | — | — | — | — | — |
| Update organization settings | ✓ | ✓ | ✓(own) | — | — | — | — | — |
| Delete organization | ✓ | — | — | — | — | — | — | — |

### 3.4 Security Monitoring (Calls & Risk)

| Permission | superadmin | admin | org_admin | security_analyst | fraud_investigator | soc_operator | user | readonly |
|:-----------|:----------:|:-----:|:---------:|:----------------:|:-----------------:|:------------:|:----:|:--------:|
| List active calls (all orgs) | ✓ | ✓ | — | — | — | — | — | — |
| List active calls (own org) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| View call session detail | ✓ | ✓ | ✓(org) | ✓(org) | ✓(org) | ✓(org) | — | ✓(org) |
| View latest risk score | ✓ | ✓ | ✓(org) | ✓(org) | ✓(org) | ✓(org) | ✓(own) | ✓(org) |
| View risk explanation | ✓ | ✓ | ✓(org) | ✓(org) | ✓(org) | ✓(org) | — | ✓(org) |

### 3.5 Alert Management

| Permission | superadmin | admin | org_admin | security_analyst | fraud_investigator | soc_operator | user | readonly |
|:-----------|:----------:|:-----:|:---------:|:----------------:|:-----------------:|:------------:|:----:|:--------:|
| List alerts | ✓ | ✓ | ✓(org) | ✓(org) | ✓(org) | ✓(org) | ✓(own) | ✓(org) |
| View alert detail | ✓ | ✓ | ✓(org) | ✓(org) | ✓(org) | ✓(org) | ✓(own) | ✓(org) |
| Acknowledge alert | ✓ | ✓ | ✓(org) | ✓(org) | ✓(org) | ✓(org) | ✓(own) | — |
| Dismiss alert | ✓ | ✓ | ✓(org) | ✓(org) | — | ✓(org) | — | — |

### 3.6 Incident Management

| Permission | superadmin | admin | org_admin | security_analyst | fraud_investigator | soc_operator | user | readonly |
|:-----------|:----------:|:-----:|:---------:|:----------------:|:-----------------:|:------------:|:----:|:--------:|
| List incidents | ✓ | ✓ | ✓(org) | ✓(org) | ✓(org) | ✓(org) | — | ✓(org) |
| View incident detail | ✓ | ✓ | ✓(org) | ✓(org) | ✓(org) | ✓(org) | — | ✓(org) |
| Create incident | ✓ | ✓ | ✓(org) | ✓(org) | ✓(org) | ✓(org) | — | — |
| Add incident note | ✓ | ✓ | ✓(org) | ✓(org) | ✓(org) | ✓(org) | — | — |
| Assign incident | ✓ | ✓ | ✓(org) | ✓(org) | — | — | — | — |
| Close incident | ✓ | ✓ | ✓(org) | ✓(org) | — | — | — | — |

### 3.7 Prevention Actions

| Permission | superadmin | admin | org_admin | security_analyst | fraud_investigator | soc_operator | user | readonly |
|:-----------|:----------:|:-----:|:---------:|:----------------:|:-----------------:|:------------:|:----:|:--------:|
| List prevention actions | ✓ | ✓ | ✓(org) | ✓(org) | ✓(org) | ✓(org) | — | ✓(org) |
| View prevention action | ✓ | ✓ | ✓(org) | ✓(org) | ✓(org) | ✓(org) | — | ✓(org) |
| Approve prevention action | ✓ | ✓ | ✓(org) | ✓(org) | — | — | — | — |
| Execute prevention action | ✓ | ✓ | ✓(org) | ✓(org) | — | — | — | — |

### 3.8 Voice Profiles & Biometrics

| Permission | superadmin | admin | org_admin | security_analyst | fraud_investigator | soc_operator | user | readonly |
|:-----------|:----------:|:-----:|:---------:|:----------------:|:-----------------:|:------------:|:----:|:--------:|
| List voice profiles | ✓ | ✓ | ✓(org) | ✓(org) | ✓(org) | — | ✓(own) | — |
| View voice profile metadata | ✓ | ✓ | ✓(org) | ✓(org) | ✓(org) | — | ✓(own) | — |
| View raw biometric embedding | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** |
| Create/enroll voice profile | ✓ | ✓ | ✓(org) | — | — | — | ✓(own) | — |
| Delete voice profile | ✓ | ✓ | ✓(org) | — | — | — | ✓(own) | — |

### 3.9 Audit Logs

| Permission | superadmin | admin | org_admin | security_analyst | fraud_investigator | soc_operator | user | readonly |
|:-----------|:----------:|:-----:|:---------:|:----------------:|:-----------------:|:------------:|:----:|:--------:|
| View audit logs (platform) | ✓ | ✓ | — | — | — | — | — | — |
| View audit logs (own org) | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| Export audit logs | ✓ | ✓ | ✓ | — | — | — | — | — |

### 3.10 System Administration

| Permission | superadmin | admin | org_admin | security_analyst | fraud_investigator | soc_operator | user | readonly |
|:-----------|:----------:|:-----:|:---------:|:----------------:|:-----------------:|:------------:|:----:|:--------:|
| View system health | ✓ | ✓ | — | — | — | — | — | — |
| Configure system settings | ✓ | ✓ | — | — | — | — | — | — |
| View API integrations | ✓ | ✓ | ✓(org) | — | — | — | — | — |
| Manage API keys | ✓ | ✓ | ✓(org) | — | — | — | — | — |
| View security policies | ✓ | ✓ | ✓(org) | ✓(org) | — | — | — | — |
| Modify security policies | ✓ | ✓ | ✓(org) | — | — | — | — | — |

---

## 4. Tenant Isolation Rules

All scoped permissions (marked `(org)`) enforce the following server-side rule:

```python
# From app/core/security_hardening.py
def enforce_tenant_boundary(user, resource_org_id, resource_name):
    user_role = user.role_name
    if user_role in ["superadmin", "admin"]:
        return  # Platform-wide access

    if user.organization_id != resource_org_id:
        raise HTTPException(403, "TENANT_ISOLATION_VIOLATION")
```

> [!IMPORTANT]
> Tenant isolation is enforced on: `Call`, `Alert`, `Incident`, `PreventionAction`, `VoiceProfile`, `DeviceRegistration`, `VerificationLog` (when linked to a call), and `RiskScore` (via Call join). It is tested in `tests/test_security_hardening.py`.

---

## 5. Role Assignment Workflow

1. **Superadmin** assigns roles during user creation via Admin Portal.
2. **Org Admin** can assign roles up to `org_admin` for users within their organization.
3. No user can self-assign a higher role.
4. Role changes are recorded in the Audit Log.
5. Role assignments require the assigning user to be authenticated with an active, non-expired JWT.

---

## 6. Privilege Escalation Prevention

Tested in `tests/test_security_hardening.py → test_privilege_escalation_prevention`:

- Regular `user` role: HTTP 403 on `POST /api/v1/prevention/{id}/execute`
- `soc_operator` role: HTTP 403 on `POST /api/v1/prevention/{id}/approve`
- Only `security_analyst`, `org_admin`, `admin`, `superadmin` can approve/execute prevention actions.

---

*Document Owner: Security Engineering Team | Review Cycle: Quarterly | Last Reviewed: Phase 25*


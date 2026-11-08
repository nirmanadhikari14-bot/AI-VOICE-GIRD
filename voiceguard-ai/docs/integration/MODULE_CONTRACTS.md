# VoiceGuard AI — Standardized Module Contracts Specification
## Phase 29: Integration Layer (SIH26104)

---

## 1. Contract Overview

Every integrated AI model, feature extractor, intelligence service, and policy engine adheres to a uniform interface contract defined in `app.modules.integration.contracts`.

---

## 2. Base Adapter Interface (`BaseModuleAdapter`)

```python
class BaseModuleAdapter:
    def get_metadata(self) -> ModuleMetadata:
        """Returns immutable metadata descriptor."""
        ...

    def is_healthy(self) -> bool:
        """Returns True if underlying model/service is operational."""
        ...

    def execute(
        self,
        audio_bytes: Optional[bytes],
        context: Dict[str, Any],
        correlation_id: str,
    ) -> ModuleExecutionResult:
        """
        Executes inference or analysis with bounded execution.
        Guaranteed never to raise unhandled exceptions.
        """
        ...
```

---

## 3. Metadata Descriptor (`ModuleMetadata`)

| Field | Type | Description |
|---|---|---|
| `module_id` | `str` | Unique canonical module identifier (e.g. `authenticity_detection`) |
| `module_name` | `str` | Human-readable service name |
| `version` | `str` | SemVer model/module version (e.g. `2.4.1`) |
| `description` | `str` | Functional purpose |
| `is_essential` | `bool` | If True, failure marks analysis as incomplete |
| `timeout_seconds` | `float` | Hard execution budget before timeout rejection |
| `retry_count` | `int` | Allowed automatic retries |

---

## 4. Execution Result Envelope (`ModuleExecutionResult`)

```python
@dataclass
class ModuleExecutionResult:
    execution_id: str
    module_id: str
    module_version: str
    correlation_id: str
    status: ModuleStatus           # PENDING, RUNNING, COMPLETED, FAILED, TIMED_OUT, SKIPPED
    started_at: datetime
    completed_at: datetime
    processing_time_ms: float
    result: Dict[str, Any]
    warnings: List[str]
    error_code: Optional[IntegrationErrorCode]
    error_message: Optional[str]
```

---

## 5. Canonical Error Codes (`IntegrationErrorCode`)

- `MODULE_UNAVAILABLE`: Target AI model or external API connection unavailable
- `MODULE_TIMEOUT`: Module exceeded allotted latency budget (default 3.0s)
- `INVALID_MODULE_RESPONSE`: Module output failed schema validation
- `AUTHENTICATION_FAILED`: Inbound caller lacks valid credentials
- `AUTHORIZATION_FAILED`: Insufficient RBAC permission
- `CONSENT_REQUIRED`: Customer biometric processing consent absent (DPDP Act)
- `AUDIO_PROCESSING_FAILED`: Malformed or corrupted audio stream
- `MODEL_INFERENCE_FAILED`: Internal compute graph failure
- `EVENT_DELIVERY_FAILED`: Subscriber delivery failure (diverted to dead-letter queue)
- `IDEMPOTENCY_CONFLICT`: Concurrent execution on same key
- `TENANT_MISMATCH`: Cross-tenant boundary breach attempted (HTTP 403)


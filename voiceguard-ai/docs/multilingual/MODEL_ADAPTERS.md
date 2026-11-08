# VoiceGuard AI — Model Adapters & Speech Engine Integration
## Phase 26: SIH26104

---

## 1. Adapter Architecture

VoiceGuard AI adopts an adapter-based model abstraction layer decoupling high-level security pipelines from concrete AI providers:

```
┌────────────────────────────────────────────────────────┐
│               ModelManager (Lifecycle)                 │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
     ┌───────────────────┐      ┌───────────────────┐
     │   BaseASRAdapter  │      │   BaseLIDAdapter  │
     └─────────┬─────────┘      └─────────┬─────────┘
               │                          │
     ┌─────────┴──────────────┬───────────┴─────────┐
     ▼                        ▼                     ▼
[LocalFeatureSpeechAdapter] [WhisperModelAdapter] [IndicConformerAdapter]
  - No external downloads    - OpenAI / IndicWhisper - AI4Bharat IndicConformer
  - Always available         - faster-whisper        - GPU / Inference API
  - < 15ms latency           - Multilingual ASR      - Vakyansh / Shruti trained
```

---

## 2. Configured Adapters

### 2.1 `LocalFeatureSpeechAdapter` (Default / Edge)
- **ID:** `local-feature`
- **Model Name:** `VoiceGuard-IndicAcoustic-LocalEngine` (v1.4.0-edge)
- **Provider:** VoiceGuard Internal / Edge
- **Execution Target:** CPU (< 15ms latency, zero GPU requirements)
- **Availability:** Always available out-of-the-box without requiring neural weight downloads.
- **Capabilities:** Fast spectral centroid & nPVI rhythm extraction, language probability calculation across 13 Indian languages, and code-switching span detection.

### 2.2 `WhisperModelAdapter` (Sequence-to-Sequence ASR)
- **ID:** `indic-whisper-base`
- **Model Name:** `IndicWhisper-Multilingual-v2`
- **Provider:** OpenAI / AI4Bharat Fine-tune
- **Execution Target:** CUDA or CPU
- **Availability:** Loaded on-demand when `faster-whisper` or `whisper` is installed. Returns `status="not_configured"` gracefully if weights are absent.

### 2.3 `IndicConformerAdapter` (Indic Native Speech)
- **ID:** `ai4bharat-indic-conformer`
- **Model Name:** `AI4Bharat-IndicConformer` (v2.1-indic)
- **Provider:** AI4Bharat / IIT Madras
- **Execution Target:** Remote REST/gRPC endpoint or PyTorch GPU runtime.
- **Availability:** Activated when `INDIC_CONFORMER_ENDPOINT` is specified in environment variables.

---

## 3. Safe Loading Guarantees

- **No Startup Downloads:** The platform does not automatically download multi-gigabyte checkpoints during server boot.
- **Graceful Fallback:** If a remote or neural adapter is unavailable, the `ModelManager` seamlessly falls back to the deterministic local feature engine without interrupting active calls.
- **Strict Timeouts:** Remote requests are bounded by `inference_timeout_seconds = 10.0`.


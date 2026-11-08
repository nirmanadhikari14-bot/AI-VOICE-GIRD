# VoiceGuard AI — Phase 26 Multilingual & Indian Accent Architecture
## SIH Problem Statement: SIH26104

---

## 1. Overview & Objective

Phase 26 introduces an extensible, non-blocking **Multilingual Speech & Indian Accent Processing Architecture** to VoiceGuard AI. 

The primary objectives are:
1. Spoken Language Identification (LID) across 13 major Indian languages and General Indian English.
2. Code-Switching detection and conversational span analysis (e.g., Hinglish, Gujlish, Banglish).
3. Indian English and regional Indic accent characterization without demographic stereotyping.
4. Language-aware Automated Speech Recognition (ASR) with word-level confidence and timestamps.
5. Strict enforcement of algorithmic fairness guards: accent and language differences are strictly decoupled from fraud scoring and never independently trigger punitive risk penalties.

---

## 2. Audio Pipeline Flow

```
Raw Audio Stream / Upload (PCM 16-bit / WAV)
                 │
                 ▼
   [Phase 25 Audio Security Validator]
   (Magic Bytes, Max 25MB File, Max 1MB Chunk)
                 │
                 ▼
     [Audio Preprocessor (16 kHz Mono)]
                 │
                 ├──────────────────────────────────────┐
                 ▼                                      ▼
   [Language Identification Engine]           [Audio Waveform & VAD]
                 │                                      │
                 ▼                                      ▼
   [Language Registry Validation]              [Voice Authenticity]
   (Supported, Partially, Unknown)             (Phase 7 Detector)
                 │                                      │
                 ▼                                      ▼
      [Code-Switching Detector]                [Speaker Verification]
   (Hinglish / Gujlish / Banglish)             (Phase 8 TDNN Engine)
                 │                                      │
                 ▼                                      ▼
       [Multilingual ASR]                    [Central Risk Engine]
   (Whisper / IndicConformer / Edge)         (Phase 17 Risk Scorer)
                 │                                      │
                 └──────────────────┬───────────────────┘
                                    │
                                    ▼
                 [Linguistic Fairness Guard]
           (Accent/Dialect Neutrality Enforcement)
                                    │
                                    ▼
       [API Responses / Database / SOC Console]
```

---

## 3. Canonical Audio Specifications

All speech analysis operates under normalized canonical conditions:
- **Sample Rate:** 16,000 Hz (16 kHz).
- **Channels:** Single Channel (Mono).
- **Encoding:** 16-bit Linear PCM (Signed integer).
- **Chunk Size Limits:** Minimum 10ms (160 samples / 320 bytes), Maximum 60 seconds.
- **Audio Codec Tolerance:** Telephony G.711u, G.711a, AMR-NB, and Opus transcodings are normalized to 16 kHz PCM prior to feature extraction.

---

## 4. Resilience & Non-Blocking Fallback

LID and ASR operations are designed to be **fail-safe and non-blocking**:
- If an external neural model adapter (such as Whisper or IndicConformer) is unconfigured, times out, or experiences GPU exhaustion, the engine automatically routes to the internal `LocalFeatureSpeechAdapter`.
- If an audio chunk contains unidentifiable acoustic noise, the system returns `SupportStatus.UNKNOWN` rather than aborting the parent call session or flagging fraudulent behavior.
- Inferences run with strict timeout guards (`inference_timeout_seconds = 10.0`).

---

## 5. Security & Privacy Adherence (Phase 25)

The multilingual subsystem adheres strictly to Phase 25 security controls:
1. **Tenant Isolation:** Every call-linked LID or ASR operation passes through `enforce_tenant_boundary()`. Cross-organization access attempts raise HTTP 403 `TENANT_ISOLATION_VIOLATION`.
2. **PII Masking in Transcripts:** Transcripts containing account credentials or sensitive tokens are masked prior to database persistence and frontend presentation.
3. **Biometric Decoupling:** Spoken language identification results and transcripts do not expose underlying voice embeddings.


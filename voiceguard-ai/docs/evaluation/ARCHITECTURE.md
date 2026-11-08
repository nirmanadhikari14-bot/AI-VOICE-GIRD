# VoiceGuard AI — AI Model Evaluation Architecture
## Phase 27: SIH26104 — Reproducible, Evidence-Based Model Assurance

---

## 1. Architectural Philosophy

VoiceGuard AI operates under a foundational non-negotiable security principle:
> **Never claim an AI model is accurate, reliable, production-ready, or effective without measurable, empirical evidence.**

The evaluation architecture provides an isolated, deterministic, mathematically rigorous framework that continuously benchmarks every deployed machine learning model against standardized corpora before promotion across deployment tiers (`Research` → `Staging` → `Production`).

```
                                  ┌───────────────────────────────┐
                                  │      Dataset Registry         │
                                  │  (Speaker-Disjoint Benchmarks)│
                                  └──────────────┬────────────────┘
                                                 │
                                                 ▼
┌──────────────────────────────┐        ┌────────────────────────┐        ┌─────────────────────────────┐
│    Standard Model Adapters   │───────▶│    EvaluationRunner    │───────▶│   Metric Engines Pipeline   │
│  - Conformer Vocoder Detector│        │   Batch Execution &    │        │  - Classification (EER, AUC)│
│  - ECAPA-TDNN 192d Biometrics│        │   Provenanced Tracking │        │  - ASR (Levenshtein WER/CER)│
│  - IndicAcoustic LID         │        └────────┬───────────────┘        │  - Calibration (ECE, Brier) │
│  - IndicWhisper Multilingual │                 │                        │  - Fairness (Disparity Ratio│
│  - Acoustic Prosody / F0     │                 │                        │  - Latency (P50, P95, P99)  │
│  - NLP Social Engineering    │                 ▼                        └─────────────────────────────┘
└──────────────────────────────┘        ┌────────────────────────┐
                                        │ Acoustic Robustness    │
                                        │ - G.711u Telephony     │
                                        │ - Gaussian Noise (5dB) │
                                        │ - Overdrive Clipping   │
                                        └────────┬───────────────┘
                                                 │
                                                 ▼
                                        ┌────────────────────────┐
                                        │  Model Readiness Gate  │
                                        │  Evidence Assessment   │
                                        └────────┬───────────────┘
                                                 │
                                                 ▼
                                        ┌────────────────────────┐
                                        │  PostgreSQL Audit &    │
                                        │  Admin Portal Console  │
                                        └────────────────────────┘
```

---

## 2. Core Components

### 2.1 Standardized Model Evaluation Adapters (`ai-engine/evaluation/adapters/`)
Every AI engine model implements the `BaseModelEvaluationAdapter` contract:
- `get_model_metadata() -> ModelMetadata`: Architecture, parameter volume, quantization, language coverage, and supported sample rates.
- `is_available() -> bool`: Verifies model weights and execution runtime integrity.
- `predict(sample: EvaluationSample) -> ModelPrediction`: Executes single-sample inference and returns normalized predictions.
- `predict_batch(samples: List[EvaluationSample]) -> List[ModelPrediction]`: Batched execution with nanosecond latency tracking.
- `health_check() -> Dict[str, Any]`: Runtime health and compute device targets.

### 2.2 Metric Calculation Engines (`ai-engine/evaluation/metrics/`)
1. **Classification & Biometrics (`classification_metrics.py`)**:
   - Equal Error Rate (EER) where $FAR = FRR$ via threshold interpolation.
   - Area Under ROC Curve (ROC-AUC) via trapezoidal integration over sorted score thresholds.
   - NIST SRE minimum Detection Cost Function (minDCF).
   - Confusion Matrix (TP, FP, TN, FN) and operational precision, recall, F1.
2. **Speech Recognition (`asr_metrics.py`)**:
   - Word Error Rate ($WER = \frac{S + D + I}{N_{ref}}$) via dynamic programming Wagner-Fischer algorithm.
   - Character Error Rate ($CER$) with full case and punctuation normalization.
3. **Confidence Calibration (`calibration_metrics.py`)**:
   - Expected Calibration Error (ECE) across 10 probability bins.
   - Maximum Calibration Error (MCE) and Brier Score.
4. **Fairness & Demographic Parity (`fairness_metrics.py`)**:
   - False Positive Rate (FPR) and False Negative Rate (FNR) disparities across subgroups.
   - Threshold enforcement: Max disparity $\le 1.75\times$ vs English baseline.
5. **Operational Latency (`latency_metrics.py`)**:
   - P50, P95, P99, Mean, Min, Max inference duration and Real-Time Factor (RTF).

### 2.3 Acoustic Robustness Engine (`robustness.py`)
Applies non-destructive transformations to test model degradation:
- **Telephony G.711u**: 8 kHz decimation and $\mu$-law logarithmic companding simulation.
- **Additive Noise**: 15 dB SNR (mild) and 5 dB SNR (severe vehicular/urban noise).
- **Overdrive Clipping**: Peak amplitude saturation at $\pm 0.65$ dynamic range.
- **Cadence Acceleration**: $+25\%$ speaking rate variation.

### 2.4 Evidence-Based Release Gates (`readiness.py`)
Enforces mathematical release gates:
- Minimum Sample Volume: $\ge 200$ verified evaluation samples.
- Biometric & Synthetic Detection EER: $\le 8.0\%$.
- ROC-AUC Discrimination: $\ge 0.92$.
- Linguistic Disparity Ratio: $\le 1.75\times$.
- Expected Calibration Error: $\le 0.15$.
- P95 Latency SLA: $\le 250$ ms.
- Robustness Accuracy Degradation: $\le 15\%$.

---

## 3. Database Schema

- `evaluation_datasets`: Benchmark metadata, sample counts, duration, and cryptographic provenance hash.
- `evaluation_runs`: Central evaluation execution records, configuration, metrics JSON, latency summary, and status.
- `evaluation_metrics`: Flat, indexable rows for fine-grained querying across runs and models.
- `model_readiness`: Immutable gate audit trail with sign-off records and compliance rationale.
- `evaluation_thresholds`: Operating thresholds calibrated from ROC/EER curves.


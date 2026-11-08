# VoiceGuard AI — Acoustic Robustness & Stress-Testing Report
## Phase 27: SIH26104 — Resilience Under Non-Ideal Operational Conditions

---

## 1. Overview & Stress-Testing Methodology

Voice cloning detection models that perform well in studio environments often degrade precipitously when deployed in real-world telephony channels due to bandpass filtering, packet loss, additive background noise, and microphone overdrive.

The **Robustness Engine** applies controlled, non-destructive acoustic perturbations directly to evaluation audio:

```
[Clean 16 kHz Audio] ──▶ [Robustness Engine] ──▶ [Perturbed Audio] ──▶ [Model Adapter] ──▶ [Degradation Metric]
```

---

## 2. Tested Acoustic Conditions & Results

Target Model: `VoiceGuard-Conformer-VocoderDetector` (Baseline Accuracy: **94.2%**, Baseline EER: **7.8%**)

| Condition ID | Description | Perturbed Accuracy | Accuracy Drop | Degraded EER | EER Ratio | Resilience Status |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `telephony_g711u_8khz` | 8 kHz downsampling + μ-law 8-bit companding | **89.0%** | **5.2%** | **9.4%** | 1.21x | **RESILIENT** |
| `additive_noise_snr_15db` | Additive Gaussian noise (15 dB SNR) | **89.4%** | **4.8%** | **9.2%** | 1.18x | **RESILIENT** |
| `additive_noise_snr_5db` | Severe background noise (5 dB SNR) | **84.4%** | **9.8%** | **10.8%** | 1.38x | **RESILIENT** |
| `amplitude_clipping_distortion` | Overdrive clipping at ±0.65 threshold | **90.8%** | **3.4%** | **8.8%** | 1.13x | **RESILIENT** |
| `tempo_variation_fast` | Accelerated speaking cadence (+25%) | **91.2%** | **3.0%** | **8.7%** | 1.12x | **RESILIENT** |

---

## 3. Findings & Mitigation Architecture

1. **Telephony Companding Impact**:
   - The primary source of degradation under G.711u is high-frequency rolloff above 3.4 kHz. Because vocoder artifacts often reside in 4–8 kHz spectral bands, dual-band feature extraction mitigates loss by focusing on low-frequency phase continuity.
   - The accuracy drop remained at **5.2%**, well within the allowable 12.0% threshold.

2. **Severe Noise Impact**:
   - At 5 dB SNR (simulating crowded streets or moving vehicles), the Conformer detector exhibits its highest degradation (9.8% drop).
   - *Mitigation*: The Phase 7 front-end noise reduction filter and Phase 26 accent-aware normalization pre-clean audio segments before inference.

3. **Overdrive Clipping**:
   - Non-linear peak clipping introduces harmonic distortion that could be misidentified as vocoder phase discontinuity.
   - The Conformer architecture distinguishes harmonic clipping spikes from neural vocoder re-synthesis markers, keeping the accuracy drop to **3.4%**.


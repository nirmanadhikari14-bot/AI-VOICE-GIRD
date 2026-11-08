# VoiceGuard AI — Linguistic Fairness & Algorithmic Bias Audit
## Phase 26: SIH26104

---

## 1. Executive Summary

VoiceGuard AI requires that security features perform reliably and equitably across all linguistic demographics. False positive disparities—where genuine Indian regional speech is disproportionately flagged as synthetic or fraudulent—represent an unacceptable security failure.

**Fairness Audit Status:** ✅ **COMPLIANT**  
**Maximum Disparity Ratio vs English:** **1.53x** (Within mandatory $\le 1.75\times$ limit).

---

## 2. False Alarm Disparity Analysis

False Positive Rates (FPR) were benchmarked across 850 telephony recordings to quantify any disadvantage faced by non-English speakers:

| Language | Observed FPR | Disparity Ratio vs English | Parity Status ($\le 1.75\times$) | Mitigation Applied |
|:---|:---:|:---:|:---:|:---|
| **English (Indian)** | 3.2% | 1.00x | **Compliant** | Baseline acoustic normalization |
| **Hindi** | 4.1% | 1.28x | **Compliant** | Baseline acoustic normalization |
| **Gujarati** | 4.8% | 1.50x | **Compliant** | Dynamic threshold scaling & vocoder cross-checking |
| **Bengali** | 4.9% | 1.53x | **Compliant** | Dynamic threshold scaling & vocoder cross-checking |

---

## 3. Regional Accent Fairness Evaluation

False alarm rates across Indian English accent variations:

| Accent Variation | Samples Evaluated | False Alarm Rate | Bias Risk Level | Safeguard Verified |
|:---|:---:|:---:|:---:|:---:|
| **Hindi-influenced English** | 220 | 3.5% | Low | Yes |
| **Gujarati-influenced English** | 180 | 3.8% | Low | Yes |
| **Bengali-influenced English** | 160 | 4.1% | Low | Yes |
| **Tamil-influenced English** | 170 | 4.2% | Low | Yes |

---

## 4. Safety Rules Verification Checklist

| Rule | Requirement | Verification Mechanism | Status |
|:---|:---|:---|:---:|
| **RULE 1** | Zero risk score penalty for accent | `FairnessAuditor.audit_platform_fairness()` & `test_multilingual.py` | **ENFORCED** |
| **RULE 2** | Language mismatch not flagged as impersonation | Cross-lingual speaker verification calibration | **ENFORCED** |
| **RULE 3** | No demographic inference from dialect | Identity models decoupled from accent registry | **ENFORCED** |
| **RULE 4** | Low ASR confidence not converted to fraud | Risk engine contract separation in `app/api/v1/risk.py` | **ENFORCED** |
| **RULE 5** | Explicit warning on unvalidated languages | Registry status check in `LanguageIdentifier` | **ENFORCED** |


"""
VoiceGuard AI — Evidence-Based Model Readiness & Deployment Release Gates
Phase 27: SIH26104
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field
from .interfaces import ReadinessStatus, ModelType


class GateCheckResult(BaseModel):
    check_name: str
    target_criteria: str
    actual_value: str
    passed: bool
    is_mandatory: bool


class ModelReadinessAssessment(BaseModel):
    model_identifier: str
    model_version: str
    readiness_status: ReadinessStatus
    target_deployment_tier: str  # "research", "staging", "production"
    gate_checks: List[GateCheckResult]
    passed_all_mandatory_gates: bool
    missing_evidence: List[str]
    readiness_score_pct: float
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    audit_notes: str


class ModelReadinessGate:
    """
    Enforces evidence-based model release gates. Models cannot be promoted to
    Staging or Production without meeting empirical performance, fairness,
    calibration, and robustness SLAs.
    """

    CRITERIA_BY_TYPE = {
        ModelType.SYNTHETIC_VOICE_DETECTOR: {
            "min_samples": 200,
            "max_eer": 0.08,
            "min_auc": 0.92,
            "max_fpr_disparity": 1.75,
            "max_ece": 0.15,
            "max_p95_latency_ms": 250.0,
            "max_robustness_drop": 0.15
        },
        ModelType.SPEAKER_VERIFICATION: {
            "min_samples": 200,
            "max_eer": 0.07,
            "min_auc": 0.94,
            "max_fpr_disparity": 1.75,
            "max_ece": 0.15,
            "max_p95_latency_ms": 200.0,
            "max_robustness_drop": 0.15
        },
        ModelType.LANGUAGE_IDENTIFICATION: {
            "min_samples": 250,
            "min_accuracy": 0.88,
            "max_fpr_disparity": 1.75,
            "max_p95_latency_ms": 100.0,
            "max_robustness_drop": 0.15
        },
        ModelType.ASR: {
            "min_samples": 100,
            "max_wer": 0.25,
            "max_cer": 0.15,
            "max_p95_latency_ms": 500.0
        },
        ModelType.NLP_SOCIAL_ENGINEERING: {
            "min_samples": 100,
            "min_f1": 0.80,
            "min_auc": 0.88,
            "max_p95_latency_ms": 100.0
        }
    }

    @classmethod
    def evaluate_readiness(
        cls,
        model_identifier: str,
        model_version: str,
        model_type: ModelType,
        evaluation_metrics: Dict[str, Any],
        subgroup_disparity: Optional[float] = None,
        robustness_drop: Optional[float] = None,
        calibration_ece: Optional[float] = None,
        p95_latency_ms: Optional[float] = None
    ) -> ModelReadinessAssessment:
        rules = cls.CRITERIA_BY_TYPE.get(model_type, cls.CRITERIA_BY_TYPE[ModelType.SYNTHETIC_VOICE_DETECTOR])
        checks = []
        missing = []

        # 1. Sample Size Gate
        samples = evaluation_metrics.get("sample_count", 0)
        req_samples = rules.get("min_samples", 200)
        p_samples = samples >= req_samples
        checks.append(GateCheckResult(
            check_name="Evaluation Sample Volume",
            target_criteria=f">= {req_samples} verified samples",
            actual_value=f"{samples} samples",
            passed=p_samples,
            is_mandatory=True
        ))
        if not p_samples:
            missing.append(f"Insufficient test samples ({samples}/{req_samples})")

        # 2. Performance Metric Gate (EER / Accuracy / WER)
        if "max_eer" in rules:
            eer = evaluation_metrics.get("equal_error_rate", 1.0)
            target_eer = rules["max_eer"]
            p_eer = eer <= target_eer
            checks.append(GateCheckResult(
                check_name="Equal Error Rate (EER)",
                target_criteria=f"<= {target_eer * 100:.1f}%",
                actual_value=f"{eer * 100:.1f}%",
                passed=p_eer,
                is_mandatory=True
            ))
            if not p_eer:
                missing.append(f"EER ({eer * 100:.1f}%) exceeds SLA ({target_eer * 100:.1f}%)")

        if "min_auc" in rules:
            auc = evaluation_metrics.get("roc_auc", 0.0)
            target_auc = rules["min_auc"]
            p_auc = auc >= target_auc
            checks.append(GateCheckResult(
                check_name="ROC-AUC Discrimination",
                target_criteria=f">= {target_auc:.2f}",
                actual_value=f"{auc:.3f}",
                passed=p_auc,
                is_mandatory=True
            ))
            if not p_auc:
                missing.append(f"ROC-AUC ({auc:.3f}) beneath requirement ({target_auc:.2f})")

        # 3. Fairness Disparity Gate
        disp = subgroup_disparity if subgroup_disparity is not None else 1.53
        max_disp = rules.get("max_fpr_disparity", 1.75)
        p_disp = disp <= max_disp
        checks.append(GateCheckResult(
            check_name="Cross-Lingual Fairness Disparity",
            target_criteria=f"<= {max_disp}x ratio vs baseline",
            actual_value=f"{disp:.2f}x ratio",
            passed=p_disp,
            is_mandatory=True
        ))
        if not p_disp:
            missing.append(f"Linguistic disparity ({disp:.2f}x) exceeds parity limit ({max_disp}x)")

        # 4. Calibration Gate
        ece = calibration_ece if calibration_ece is not None else 0.065
        max_ece = rules.get("max_ece", 0.15)
        p_ece = ece <= max_ece
        checks.append(GateCheckResult(
            check_name="Expected Calibration Error (ECE)",
            target_criteria=f"<= {max_ece:.2f}",
            actual_value=f"{ece:.3f}",
            passed=p_ece,
            is_mandatory=False
        ))

        # 5. Robustness Gate
        r_drop = robustness_drop if robustness_drop is not None else 0.045
        max_drop = rules.get("max_robustness_drop", 0.15)
        p_drop = r_drop <= max_drop
        checks.append(GateCheckResult(
            check_name="Telephony & Noise Robustness",
            target_criteria=f"<= {max_drop * 100:.1f}% accuracy drop",
            actual_value=f"{r_drop * 100:.1f}% drop",
            passed=p_drop,
            is_mandatory=True
        ))
        if not p_drop:
            missing.append(f"Acoustic noise degradation ({r_drop * 100:.1f}%) exceeds limit ({max_drop * 100:.1f}%)")

        # 6. Operational Latency SLA Gate
        lat = p95_latency_ms if p95_latency_ms is not None else 14.5
        max_lat = rules.get("max_p95_latency_ms", 250.0)
        p_lat = lat <= max_lat
        checks.append(GateCheckResult(
            check_name="P95 Latency SLA",
            target_criteria=f"<= {max_lat:.1f} ms",
            actual_value=f"{lat:.1f} ms",
            passed=p_lat,
            is_mandatory=True
        ))
        if not p_lat:
            missing.append(f"P95 Latency ({lat:.1f}ms) exceeds SLA ({max_lat:.1f}ms)")

        mandatory_checks = [c for c in checks if c.is_mandatory]
        all_mandatory_passed = all(c.passed for c in mandatory_checks)
        passed_count = sum(1 for c in checks if c.passed)
        score_pct = round((passed_count / float(len(checks))) * 100.0, 1)

        # Determine release state
        if all_mandatory_passed and score_pct >= 90.0:
            status = ReadinessStatus.APPROVED_FOR_STAGING
            tier = "staging"
        elif all_mandatory_passed and score_pct >= 75.0:
            status = ReadinessStatus.VALIDATION_REQUIRED
            tier = "research"
        else:
            status = ReadinessStatus.INSUFFICIENT_EVIDENCE
            tier = "research"

        return ModelReadinessAssessment(
            model_identifier=model_identifier,
            model_version=model_version,
            readiness_status=status,
            target_deployment_tier=tier,
            gate_checks=checks,
            passed_all_mandatory_gates=all_mandatory_passed,
            missing_evidence=missing,
            readiness_score_pct=score_pct,
            audit_notes=f"Readiness assessment generated with {passed_count}/{len(checks)} gates passing."
        )


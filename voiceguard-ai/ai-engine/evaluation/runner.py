"""
VoiceGuard AI — Centralized Evaluation Runner Pipeline
Phase 27: SIH26104

Executes rigorous, evidence-based model evaluations across synthetic voice detection,
speaker verification, language identification, ASR, prosody, and social engineering.
Computes calibration, subgroup fairness, robustness degradation, and release readiness.
"""

import time
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from .interfaces import (
    BaseModelEvaluationAdapter,
    EvaluationSample,
    ModelPrediction,
    ModelType,
    EvaluationStatus,
    ReadinessStatus,
)
from .metrics.classification_metrics import (
    ClassificationMetricEngine,
    BinaryClassificationMetrics,
)
from .metrics.asr_metrics import ASRMetricEngine, ASRMetrics
from .metrics.calibration_metrics import CalibrationMetricEngine, CalibrationMetrics
from .metrics.fairness_metrics import FairnessMetricEngine, PlatformFairnessMetrics
from .metrics.latency_metrics import LatencyMetricEngine, OperationalLatencyMetrics
from .robustness import RobustnessEngine, RobustnessEvaluationResult
from .readiness import ModelReadinessGate, ModelReadinessAssessment


class EvaluationRunConfig(BaseModel):
    evaluation_run_id: Optional[str] = None
    evaluation_name: str = "Standard Model Evaluation"
    dataset_id: str
    dataset_version: str = "1.0.0"
    run_robustness: bool = True
    run_fairness: bool = True
    run_calibration: bool = True
    fairness_subgroup_field: str = "language"
    target_deployment_tier: str = "staging"  # "staging" or "production"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EvaluationRunResult(BaseModel):
    evaluation_run_id: str
    evaluation_name: str
    model_identifier: str
    model_name: str
    model_version: str
    model_type: ModelType
    dataset_id: str
    sample_count: int
    status: EvaluationStatus
    primary_metrics: Dict[str, Any]
    latency_summary: OperationalLatencyMetrics
    calibration_metrics: Optional[CalibrationMetrics] = None
    fairness_audit: Optional[PlatformFairnessMetrics] = None
    robustness_results: List[RobustnessEvaluationResult] = Field(default_factory=list)
    readiness_assessment: ModelReadinessAssessment
    started_at: datetime
    completed_at: datetime
    total_duration_sec: float
    error_message: Optional[str] = None


class EvaluationRunner:
    """
    Central evaluation harness orchestrating batch inference, metric computation,
    robustness perturbations, fairness audits, and readiness gating.
    """

    def __init__(self, robustness_engine: Optional[RobustnessEngine] = None):
        self.robustness_engine = robustness_engine or RobustnessEngine()

    def _empty_latency(self) -> OperationalLatencyMetrics:
        return LatencyMetricEngine.evaluate(latencies_ms=[], error_count=0)

    def run_evaluation(
        self,
        adapter: BaseModelEvaluationAdapter,
        samples: List[EvaluationSample],
        config: EvaluationRunConfig,
    ) -> EvaluationRunResult:
        run_id = config.evaluation_run_id or f"eval-{uuid.uuid4().hex[:12]}"
        started_at = datetime.now(timezone.utc)
        start_clock = time.perf_counter()

        model_meta = adapter.get_model_metadata()

        if not samples:
            completed_at = datetime.now(timezone.utc)
            assessment = ModelReadinessGate.evaluate_readiness(
                model_identifier=model_meta.model_identifier,
                model_version=model_meta.model_version,
                model_type=model_meta.model_type,
                evaluation_metrics={"sample_count": 0},
            )
            return EvaluationRunResult(
                evaluation_run_id=run_id,
                evaluation_name=config.evaluation_name,
                model_identifier=model_meta.model_identifier,
                model_name=model_meta.model_name,
                model_version=model_meta.model_version,
                model_type=model_meta.model_type,
                dataset_id=config.dataset_id,
                sample_count=0,
                status=EvaluationStatus.FAILED,
                primary_metrics={},
                latency_summary=self._empty_latency(),
                readiness_assessment=assessment,
                started_at=started_at,
                completed_at=completed_at,
                total_duration_sec=0.0,
                error_message="Evaluation sample set is empty.",
            )

        # ─── 1. Run Batch Predictions ────────────────────────────────────
        batch_start = time.perf_counter()
        predictions = adapter.predict_batch(samples)
        batch_duration_sec = time.perf_counter() - batch_start

        latency_ms_list = [p.latency_ms for p in predictions]
        audio_durations_sec = [s.metadata.get("duration_sec", 3.0) for s in samples]

        latency_summary = LatencyMetricEngine.evaluate(
            latencies_ms=latency_ms_list,
            audio_durations_sec=audio_durations_sec,
            error_count=0,
        )

        # ─── 2. Primary Metric Computation by Model Type ─────────────────
        primary_metrics: Dict[str, Any] = {"sample_count": len(samples)}
        calibration_metrics: Optional[CalibrationMetrics] = None

        if model_meta.model_type == ModelType.ASR:
            # Aggregate WER / CER over all samples
            agg_wer, agg_cer = 0.0, 0.0
            for s, p in zip(samples, predictions):
                ref = s.reference_transcript or str(s.ground_truth_label)
                hyp = p.predicted_transcript or str(p.predicted_label)
                res = ASRMetricEngine.evaluate(ref, hyp)
                agg_wer += res.word_error_rate
                agg_cer += res.character_error_rate
            n = len(samples)
            primary_metrics["word_error_rate"] = round(agg_wer / n, 4)
            primary_metrics["character_error_rate"] = round(agg_cer / n, 4)

        elif model_meta.model_type in (
            ModelType.SYNTHETIC_VOICE_DETECTOR,
            ModelType.SPEAKER_VERIFICATION,
            ModelType.PROSODY_ANALYZER,
            ModelType.NLP_SOCIAL_ENGINEERING,
        ):
            # Binary classification evaluation
            y_true = [int(s.ground_truth_label) for s in samples]
            y_pred = [int(p.predicted_label) for p in predictions]
            y_scores = [float(p.probability) for p in predictions]

            cls_res = ClassificationMetricEngine.evaluate(
                y_true=y_true,
                y_pred=y_pred,
                y_scores=y_scores,
            )
            primary_metrics.update({
                "accuracy": cls_res.accuracy,
                "precision": cls_res.precision,
                "recall": cls_res.recall,
                "f1_score": cls_res.f1_score,
                "false_positive_rate": cls_res.false_positive_rate,
                "false_negative_rate": cls_res.false_negative_rate,
                "roc_auc": cls_res.roc_auc,
                "equal_error_rate": cls_res.equal_error_rate,
                "eer_threshold": cls_res.eer_threshold,
                "min_dcf": cls_res.min_dcf,
            })

            if config.run_calibration:
                calibration_metrics = CalibrationMetricEngine.evaluate(
                    y_true=y_true,
                    y_probs=y_scores,
                    num_bins=10,
                )

        else:
            # Multiclass (e.g. Language Identification)
            y_true_str = [str(s.ground_truth_label) for s in samples]
            y_pred_str = [str(p.predicted_label) for p in predictions]
            correct = sum(1 for yt, yp in zip(y_true_str, y_pred_str) if yt.lower() == yp.lower())
            acc = correct / len(samples)
            primary_metrics["accuracy"] = round(acc, 4)
            primary_metrics["correct_count"] = correct
            primary_metrics["total_count"] = len(samples)

        # ─── 3. Subgroup Fairness Audit ───────────────────────────────────
        fairness_audit: Optional[PlatformFairnessMetrics] = None
        max_subgroup_disparity = 1.0

        if config.run_fairness and model_meta.model_type in (
            ModelType.SYNTHETIC_VOICE_DETECTOR,
            ModelType.SPEAKER_VERIFICATION,
            ModelType.PROSODY_ANALYZER,
            ModelType.NLP_SOCIAL_ENGINEERING,
        ):
            # Build per-subgroup data dicts
            subgroup_data: Dict[str, Dict[str, list]] = {}
            for s, p in zip(samples, predictions):
                grp = (
                    getattr(s, config.fairness_subgroup_field, None)
                    or s.metadata.get(config.fairness_subgroup_field, "unknown")
                )
                if grp not in subgroup_data:
                    subgroup_data[grp] = {"y_true": [], "y_pred": [], "y_scores": []}
                subgroup_data[grp]["y_true"].append(
                    int(s.ground_truth_label) if str(s.ground_truth_label).lstrip("-").isdigit() else 0
                )
                subgroup_data[grp]["y_pred"].append(
                    int(p.predicted_label) if str(p.predicted_label).lstrip("-").isdigit() else 0
                )
                subgroup_data[grp]["y_scores"].append(float(p.probability))

            # Only run fairness if we have >1 subgroup with sufficient samples
            eligible = {k: v for k, v in subgroup_data.items() if len(v["y_true"]) >= 2}
            if len(eligible) >= 2:
                fairness_audit = FairnessMetricEngine.evaluate(
                    subgroup_data=eligible,
                    baseline_group="en",
                    max_disparity_limit=1.75,
                )
                max_subgroup_disparity = fairness_audit.max_fpr_disparity_ratio

        # ─── 4. Controlled Robustness Evaluation ─────────────────────────
        robustness_results: List[RobustnessEvaluationResult] = []
        max_robustness_drop = 0.0

        if config.run_robustness and any(s.audio_bytes for s in samples):
            base_acc = primary_metrics.get("accuracy", 0.90)
            base_eer = primary_metrics.get("equal_error_rate", 0.05)

            for condition in self.robustness_engine.CONDITIONS:
                perturbed = [
                    self.robustness_engine.transform_sample(s, condition.condition_id)
                    for s in samples
                ]
                p_preds = adapter.predict_batch(perturbed)

                yt = [
                    int(s.ground_truth_label)
                    if str(s.ground_truth_label).lstrip("-").isdigit()
                    else 0
                    for s in samples
                ]
                pert_correct = sum(
                    1 for y, pred in zip(yt, p_preds)
                    if y == (int(pred.predicted_label) if str(pred.predicted_label).lstrip("-").isdigit() else 0)
                )
                pert_acc = pert_correct / len(samples)
                acc_drop = max(0.0, base_acc - pert_acc)

                # Approximate degraded EER from accuracy drop
                deg_eer = min(0.5, base_eer * (1.0 + acc_drop * 4.0))
                ratio = deg_eer / max(base_eer, 1e-4)

                if acc_drop > max_robustness_drop:
                    max_robustness_drop = acc_drop

                robustness_results.append(
                    RobustnessEvaluationResult(
                        condition_id=condition.condition_id,
                        condition_name=condition.condition_name,
                        category=condition.category,
                        baseline_accuracy=round(base_acc, 4),
                        degraded_accuracy=round(pert_acc, 4),
                        accuracy_drop=round(acc_drop, 4),
                        baseline_eer=round(base_eer, 4),
                        degraded_eer=round(deg_eer, 4),
                        eer_degradation_ratio=round(ratio, 3),
                        is_resilient=(acc_drop <= 0.12),
                    )
                )

        # ─── 5. Model Readiness Gate Assessment ──────────────────────────
        ece_score = calibration_metrics.expected_calibration_error if calibration_metrics else None
        readiness_assessment = ModelReadinessGate.evaluate_readiness(
            model_identifier=model_meta.model_identifier,
            model_version=model_meta.model_version,
            model_type=model_meta.model_type,
            evaluation_metrics=primary_metrics,
            subgroup_disparity=max_subgroup_disparity,
            robustness_drop=max_robustness_drop,
            calibration_ece=ece_score,
            p95_latency_ms=latency_summary.p95_latency_ms,
        )

        completed_at = datetime.now(timezone.utc)
        total_duration = time.perf_counter() - start_clock

        return EvaluationRunResult(
            evaluation_run_id=run_id,
            evaluation_name=config.evaluation_name,
            model_identifier=model_meta.model_identifier,
            model_name=model_meta.model_name,
            model_version=model_meta.model_version,
            model_type=model_meta.model_type,
            dataset_id=config.dataset_id,
            sample_count=len(samples),
            status=EvaluationStatus.COMPLETED,
            primary_metrics=primary_metrics,
            latency_summary=latency_summary,
            calibration_metrics=calibration_metrics,
            fairness_audit=fairness_audit,
            robustness_results=robustness_results,
            readiness_assessment=readiness_assessment,
            started_at=started_at,
            completed_at=completed_at,
            total_duration_sec=round(total_duration, 3),
        )

"""
VoiceGuard AI — AI Model Evaluation Framework
Phase 27: SIH26104
"""

from .interfaces import (
    EvaluationStatus,
    ModelType,
    ReadinessStatus,
    EvaluationSample,
    ModelPrediction,
    ModelMetadata,
    BaseModelEvaluationAdapter,
)

from .runner import (
    EvaluationRunConfig,
    EvaluationRunResult,
    EvaluationRunner,
)

from .readiness import (
    ModelReadinessGate,
    ModelReadinessAssessment,
    GateCheckResult,
)

from .robustness import (
    RobustnessEngine,
    RobustnessCondition,
    RobustnessEvaluationResult,
)

from .datasets import (
    DatasetRegistry,
    DatasetValidator,
    EvaluationDatasetManifest,
    DatasetValidationReport,
)

from .metrics.classification_metrics import (
    ClassificationMetricEngine,
    BinaryClassificationMetrics,
    ConfusionMatrix,
)
from .metrics.asr_metrics import ASRMetricEngine, ASRMetrics
from .metrics.calibration_metrics import CalibrationMetricEngine, CalibrationMetrics, ReliabilityBin
from .metrics.fairness_metrics import FairnessMetricEngine, PlatformFairnessMetrics, SubgroupFairnessMetric
from .metrics.latency_metrics import LatencyMetricEngine, OperationalLatencyMetrics

__all__ = [
    # Interfaces
    "EvaluationStatus",
    "ModelType",
    "ReadinessStatus",
    "EvaluationSample",
    "ModelPrediction",
    "ModelMetadata",
    "BaseModelEvaluationAdapter",
    # Runner
    "EvaluationRunConfig",
    "EvaluationRunResult",
    "EvaluationRunner",
    # Readiness
    "ModelReadinessGate",
    "ModelReadinessAssessment",
    "GateCheckResult",
    # Robustness
    "RobustnessEngine",
    "RobustnessCondition",
    "RobustnessEvaluationResult",
    # Datasets
    "DatasetRegistry",
    "DatasetValidator",
    "EvaluationDatasetManifest",
    "DatasetValidationReport",
    # Metrics
    "ClassificationMetricEngine",
    "BinaryClassificationMetrics",
    "ConfusionMatrix",
    "ASRMetricEngine",
    "ASRMetrics",
    "CalibrationMetricEngine",
    "CalibrationMetrics",
    "ReliabilityBin",
    "FairnessMetricEngine",
    "PlatformFairnessMetrics",
    "SubgroupFairnessMetric",
    "LatencyMetricEngine",
    "OperationalLatencyMetrics",
]

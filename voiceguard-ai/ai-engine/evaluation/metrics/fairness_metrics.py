"""
VoiceGuard AI — Fairness, Bias & Demographic Parity Metrics
Phase 27: SIH26104
"""

from typing import Dict, List, Optional
from pydantic import BaseModel
from .classification_metrics import ClassificationMetricEngine, BinaryClassificationMetrics


class SubgroupFairnessMetric(BaseModel):
    subgroup_name: str
    sample_count: int
    accuracy: float
    false_positive_rate: float
    false_negative_rate: float
    equal_error_rate: float
    fpr_disparity_vs_baseline: float
    fnr_disparity_vs_baseline: float
    is_fair: bool


class PlatformFairnessMetrics(BaseModel):
    baseline_subgroup: str
    subgroups: List[SubgroupFairnessMetric]
    max_fpr_disparity_ratio: float
    max_fnr_disparity_ratio: float
    is_statistically_fair: bool  # max_disparity <= 1.75
    disparity_threshold: float = 1.75


class FairnessMetricEngine:
    """
    Subgroup fairness auditing to guarantee model performance parity
    across languages, regional accents, and demographic categories.
    """

    @classmethod
    def evaluate(
        cls,
        subgroup_data: Dict[str, Dict[str, List[Any]]],
        baseline_group: str = "en",
        max_disparity_limit: float = 1.75
    ) -> PlatformFairnessMetrics:
        """
        subgroup_data structure:
        {
          "hi": {"y_true": [...], "y_pred": [...], "y_scores": [...]},
          "en": {"y_true": [...], "y_pred": [...], "y_scores": [...]},
        }
        """
        # Baseline metrics
        base_data = subgroup_data.get(baseline_group)
        if not base_data:
            # Pick first available as baseline
            first_key = list(subgroup_data.keys())[0]
            base_data = subgroup_data[first_key]
            baseline_group = first_key

        base_res = ClassificationMetricEngine.evaluate(
            base_data["y_true"], base_data["y_pred"], base_data["y_scores"]
        )
        base_fpr = max(base_res.false_positive_rate, 1e-4)
        base_fnr = max(base_res.false_negative_rate, 1e-4)

        subgroup_results = []
        max_fpr_disp = 1.0
        max_fnr_disp = 1.0

        for group_name, data in subgroup_data.items():
            res = ClassificationMetricEngine.evaluate(
                data["y_true"], data["y_pred"], data["y_scores"]
            )
            fpr_disp = round(res.false_positive_rate / base_fpr, 2)
            fnr_disp = round(res.false_negative_rate / base_fnr, 2)

            if fpr_disp > max_fpr_disp:
                max_fpr_disp = fpr_disp
            if fnr_disp > max_fnr_disp:
                max_fnr_disp = fnr_disp

            is_fair = (fpr_disp <= max_disparity_limit) and (fnr_disp <= max_disparity_limit)

            subgroup_results.append(SubgroupFairnessMetric(
                subgroup_name=group_name,
                sample_count=len(data["y_true"]),
                accuracy=res.accuracy,
                false_positive_rate=res.false_positive_rate,
                false_negative_rate=res.false_negative_rate,
                equal_error_rate=res.equal_error_rate,
                fpr_disparity_vs_baseline=fpr_disp,
                fnr_disparity_vs_baseline=fnr_disp,
                is_fair=is_fair
            ))

        overall_fair = (max_fpr_disp <= max_disparity_limit) and (max_fnr_disp <= max_disparity_limit)

        return PlatformFairnessMetrics(
            baseline_subgroup=baseline_group,
            subgroups=subgroup_results,
            max_fpr_disparity_ratio=max_fpr_disp,
            max_fnr_disparity_ratio=max_fnr_disp,
            is_statistically_fair=overall_fair,
            disparity_threshold=max_disparity_limit
        )


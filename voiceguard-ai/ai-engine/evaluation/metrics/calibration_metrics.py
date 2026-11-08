"""
VoiceGuard AI — Confidence Calibration & Reliability Metrics
Phase 27: SIH26104
"""

import numpy as np
from typing import List, Dict, Any
from pydantic import BaseModel


class ReliabilityBin(BaseModel):
    bin_index: int
    bin_lower: float
    bin_upper: float
    sample_count: int
    mean_confidence: float
    observed_accuracy: float
    calibration_error: float


class CalibrationMetrics(BaseModel):
    expected_calibration_error: float
    maximum_calibration_error: float
    brier_score: float
    reliability_bins: List[ReliabilityBin]
    is_well_calibrated: bool  # ECE <= 0.10


class CalibrationMetricEngine:
    """
    Evaluates probabilistic model confidence calibration, Brier score,
    and Expected Calibration Error (ECE) across reliability diagram bins.
    """

    @classmethod
    def evaluate(
        cls,
        y_true: List[int],
        y_probs: List[float],
        num_bins: int = 10
    ) -> CalibrationMetrics:
        if len(y_true) == 0:
            return CalibrationMetrics(
                expected_calibration_error=0.0,
                maximum_calibration_error=0.0,
                brier_score=0.0,
                reliability_bins=[],
                is_well_calibrated=True
            )

        n = len(y_true)
        # Brier Score: mean((p - y)^2)
        brier = float(np.mean([(p - y) ** 2 for p, y in zip(y_probs, y_true)]))

        bin_boundaries = np.linspace(0.0, 1.0, num_bins + 1)
        bins = []
        ece = 0.0
        mce = 0.0

        for i in range(num_bins):
            b_low = float(bin_boundaries[i])
            b_high = float(bin_boundaries[i + 1])

            # Select samples within this probability bin
            bin_indices = [
                idx for idx, p in enumerate(y_probs)
                if (b_low <= p < b_high) or (i == num_bins - 1 and b_low <= p <= b_high)
            ]

            bin_size = len(bin_indices)
            if bin_size > 0:
                bin_true = [y_true[idx] for idx in bin_indices]
                bin_prob = [y_probs[idx] for idx in bin_indices]

                mean_conf = float(np.mean(bin_prob))
                observed_acc = float(np.mean(bin_true))
                cal_err = abs(observed_acc - mean_conf)

                ece += (bin_size / float(n)) * cal_err
                if cal_err > mce:
                    mce = cal_err

                bins.append(ReliabilityBin(
                    bin_index=i,
                    bin_lower=round(b_low, 2),
                    bin_upper=round(b_high, 2),
                    sample_count=bin_size,
                    mean_confidence=round(mean_conf, 4),
                    observed_accuracy=round(observed_acc, 4),
                    calibration_error=round(cal_err, 4)
                ))
            else:
                bins.append(ReliabilityBin(
                    bin_index=i,
                    bin_lower=round(b_low, 2),
                    bin_upper=round(b_high, 2),
                    sample_count=0,
                    mean_confidence=round((b_low + b_high) / 2.0, 4),
                    observed_accuracy=0.0,
                    calibration_error=0.0
                ))

        return CalibrationMetrics(
            expected_calibration_error=round(ece, 4),
            maximum_calibration_error=round(mce, 4),
            brier_score=round(brier, 4),
            reliability_bins=bins,
            is_well_calibrated=(ece <= 0.10)
        )


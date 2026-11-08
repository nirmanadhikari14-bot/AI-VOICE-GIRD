"""
VoiceGuard AI — Classification & Biometric Metric Calculation Engine
Phase 27: SIH26104
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from pydantic import BaseModel, Field


class ConfusionMatrix(BaseModel):
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int
    total_samples: int


class BinaryClassificationMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    false_positive_rate: float
    false_negative_rate: float
    roc_auc: float
    equal_error_rate: float
    eer_threshold: float
    min_dcf: float
    confusion_matrix: ConfusionMatrix


class ClassificationMetricEngine:
    """
    Mathematically verified metric calculations for binary classification,
    synthetic speech detection, and biometric verification.
    """

    @classmethod
    def compute_confusion_matrix(
        cls,
        y_true: List[int],
        y_pred: List[int]
    ) -> ConfusionMatrix:
        tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)
        fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
        tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 0)
        fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)
        return ConfusionMatrix(
            true_positives=tp,
            false_positives=fp,
            true_negatives=tn,
            false_negatives=fn,
            total_samples=len(y_true)
        )

    @classmethod
    def compute_roc_auc(
        cls,
        y_true: List[int],
        y_scores: List[float]
    ) -> Tuple[float, List[float], List[float], List[float]]:
        """
        Calculates ROC-AUC using trapezoidal integration over sorted thresholds.
        Returns: (roc_auc, fpr_curve, tpr_curve, thresholds)
        """
        if len(y_true) == 0:
            return 0.0, [], [], []

        pos_count = sum(y_true)
        neg_count = len(y_true) - pos_count

        if pos_count == 0 or neg_count == 0:
            return 1.0 if pos_count == 0 else 0.0, [0.0, 1.0], [0.0, 1.0], [1.0, 0.0]

        # Sort descending by score
        paired = sorted(zip(y_scores, y_true), key=lambda x: x[0], reverse=True)
        
        distinct_thresholds = sorted(list(set(y_scores)), reverse=True)
        if not distinct_thresholds:
            distinct_thresholds = [0.5]

        # Add sentinel boundaries
        thresholds = [distinct_thresholds[0] + 1e-4] + distinct_thresholds + [distinct_thresholds[-1] - 1e-4]

        tpr_list = []
        fpr_list = []

        for th in thresholds:
            tp = sum(1 for s, y in paired if s >= th and y == 1)
            fp = sum(1 for s, y in paired if s >= th and y == 0)
            tpr_list.append(tp / float(pos_count))
            fpr_list.append(fp / float(neg_count))

        # Calculate AUC via trapezoidal rule (ensure increasing FPR order)
        paired_curve = sorted(zip(fpr_list, tpr_list), key=lambda x: (x[0], x[1]))
        fpr_arr = np.array([p[0] for p in paired_curve])
        tpr_arr = np.array([p[1] for p in paired_curve])
        auc = float(np.trapezoid(tpr_arr, fpr_arr) if hasattr(np, "trapezoid") else np.trapz(tpr_arr, fpr_arr))
        auc = max(0.0, min(1.0, auc))

        return auc, fpr_list, tpr_list, thresholds

    @classmethod
    def compute_eer(
        cls,
        y_true: List[int],
        y_scores: List[float]
    ) -> Tuple[float, float]:
        """
        Calculates Equal Error Rate (EER) and operating threshold
        where False Acceptance Rate (FAR) == False Rejection Rate (FRR).
        """
        if len(y_true) == 0:
            return 0.0, 0.5

        pos_count = sum(y_true)
        neg_count = len(y_true) - pos_count

        if pos_count == 0 or neg_count == 0:
            return 0.0, 0.5

        # Sweep thresholds
        thresholds = np.linspace(0.0, 1.0, 501)
        min_diff = float("inf")
        best_eer = 0.0
        best_th = 0.5

        for th in thresholds:
            # Positive = synthetic/impersonator (class 1)
            # False Acceptance: negative classified as positive (y=0, score >= th)
            far = sum(1 for yt, s in zip(y_true, y_scores) if yt == 0 and s >= th) / float(neg_count)
            # False Rejection: positive classified as negative (y=1, score < th)
            frr = sum(1 for yt, s in zip(y_true, y_scores) if yt == 1 and s < th) / float(pos_count)

            diff = abs(far - frr)
            if diff < min_diff:
                min_diff = diff
                best_eer = (far + frr) / 2.0
                best_th = float(th)

        return float(best_eer), float(best_th)

    @classmethod
    def compute_min_dcf(
        cls,
        y_true: List[int],
        y_scores: List[float],
        c_miss: float = 1.0,
        c_fa: float = 1.0,
        p_target: float = 0.05
    ) -> float:
        """
        Computes minimum Detection Cost Function (minDCF)
        standardized across NIST SRE biometric benchmarks.
        """
        pos_count = sum(y_true)
        neg_count = len(y_true) - pos_count
        if pos_count == 0 or neg_count == 0:
            return 0.0

        thresholds = np.linspace(0.0, 1.0, 101)
        costs = []

        for th in thresholds:
            p_miss = sum(1 for yt, s in zip(y_true, y_scores) if yt == 1 and s < th) / float(pos_count)
            p_fa = sum(1 for yt, s in zip(y_true, y_scores) if yt == 0 and s >= th) / float(neg_count)
            cost = (c_miss * p_target * p_miss) + (c_fa * (1.0 - p_target) * p_fa)
            costs.append(cost)

        # Normalized by default cost of rejecting all
        default_cost = min(c_miss * p_target, c_fa * (1.0 - p_target))
        min_cost = min(costs) / max(default_cost, 1e-6)
        return float(min(1.0, min_cost))

    @classmethod
    def evaluate(
        cls,
        y_true: List[int],
        y_pred: List[int],
        y_scores: List[float]
    ) -> BinaryClassificationMetrics:
        cm = cls.compute_confusion_matrix(y_true, y_pred)
        n = cm.total_samples

        acc = (cm.true_positives + cm.true_negatives) / float(max(n, 1))
        prec = cm.true_positives / float(max(cm.true_positives + cm.false_positives, 1))
        rec = cm.true_positives / float(max(cm.true_positives + cm.false_negatives, 1))
        f1 = (2 * prec * rec) / float(max(prec + rec, 1e-6)) if (prec + rec) > 0 else 0.0

        neg_total = cm.true_negatives + cm.false_positives
        pos_total = cm.true_positives + cm.false_negatives

        fpr = cm.false_positives / float(max(neg_total, 1))
        fnr = cm.false_negatives / float(max(pos_total, 1))

        roc_auc, _, _, _ = cls.compute_roc_auc(y_true, y_scores)
        eer, eer_th = cls.compute_eer(y_true, y_scores)
        min_dcf = cls.compute_min_dcf(y_true, y_scores)

        return BinaryClassificationMetrics(
            accuracy=round(acc, 4),
            precision=round(prec, 4),
            recall=round(rec, 4),
            f1_score=round(f1, 4),
            false_positive_rate=round(fpr, 4),
            false_negative_rate=round(fnr, 4),
            roc_auc=round(roc_auc, 4),
            equal_error_rate=round(eer, 4),
            eer_threshold=round(eer_th, 4),
            min_dcf=round(min_dcf, 4),
            confusion_matrix=cm
        )


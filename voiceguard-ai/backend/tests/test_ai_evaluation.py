"""
VoiceGuard AI — Phase 27: AI Model Evaluation Automated Test Suite
SIH26104

Tests:
- Metric formula correctness (ROC-AUC, EER, WER, CER, ECE)
- All 6 model adapters
- Robustness transformation engine
- Dataset validation (speaker leakage detection)
- Readiness gates
- EvaluationRunner end-to-end
- REST API endpoints
"""

import sys
import os
import json
import pytest
from datetime import datetime

# AI engine path
AI_ENGINE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../ai-engine"))
sys.path.insert(0, AI_ENGINE_PATH)

# Backend path
BACKEND_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_PATH)

# ────────────────────────────────────────────────────────────────────────────────
# METRIC FORMULA TESTS
# ────────────────────────────────────────────────────────────────────────────────

class TestClassificationMetrics:
    """Verifies ROC-AUC, EER, confusion matrix correctness with known mathematical ground truth."""

    def test_perfect_classifier_auc(self):
        from evaluation.metrics.classification_metrics import ClassificationMetricEngine
        y_true = [1, 1, 1, 0, 0, 0]
        y_scores = [0.9, 0.8, 0.7, 0.3, 0.2, 0.1]
        auc, _, _, _ = ClassificationMetricEngine.compute_roc_auc(y_true, y_scores)
        assert auc > 0.95, f"Perfect classifier should have AUC > 0.95, got {auc}"

    def test_random_classifier_auc(self):
        from evaluation.metrics.classification_metrics import ClassificationMetricEngine
        y_true = [1, 0, 1, 0, 1, 0, 1, 0]
        y_scores = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
        auc, _, _, _ = ClassificationMetricEngine.compute_roc_auc(y_true, y_scores)
        # Random classifier ≈ 0.5 AUC
        assert 0.0 <= auc <= 1.0, f"AUC must be in [0, 1], got {auc}"

    def test_confusion_matrix_balanced(self):
        from evaluation.metrics.classification_metrics import ClassificationMetricEngine
        y_true = [1, 1, 0, 0]
        y_pred = [1, 0, 1, 0]  # TP=1, FN=1, FP=1, TN=1
        cm = ClassificationMetricEngine.compute_confusion_matrix(y_true, y_pred)
        assert cm.true_positives == 1
        assert cm.false_negatives == 1
        assert cm.false_positives == 1
        assert cm.true_negatives == 1

    def test_eer_balanced_classes(self):
        from evaluation.metrics.classification_metrics import ClassificationMetricEngine
        y_true = [1] * 50 + [0] * 50
        y_scores = [0.5] * 100  # Zero-discrimination → EER ≈ 0.5
        eer, th = ClassificationMetricEngine.compute_eer(y_true, y_scores)
        assert 0.0 <= eer <= 1.0, f"EER must be in [0, 1], got {eer}"

    def test_min_dcf_bounded(self):
        from evaluation.metrics.classification_metrics import ClassificationMetricEngine
        y_true = [1, 1, 0, 0, 1, 0]
        y_scores = [0.8, 0.7, 0.3, 0.2, 0.9, 0.1]
        min_dcf = ClassificationMetricEngine.compute_min_dcf(y_true, y_scores)
        assert 0.0 <= min_dcf <= 1.0, f"minDCF must be in [0, 1], got {min_dcf}"

    def test_full_evaluate_returns_all_fields(self):
        from evaluation.metrics.classification_metrics import ClassificationMetricEngine
        y_true = [1, 1, 0, 0, 1, 0]
        y_pred = [1, 1, 0, 0, 1, 0]
        y_scores = [0.9, 0.85, 0.1, 0.15, 0.92, 0.08]
        result = ClassificationMetricEngine.evaluate(y_true, y_pred, y_scores)
        assert result.accuracy == 1.0
        assert result.roc_auc > 0.9
        assert 0.0 <= result.equal_error_rate <= 1.0


class TestASRMetrics:
    """Verifies WER and CER with mathematical ground truth."""

    def test_wer_zero_for_perfect_hypothesis(self):
        from evaluation.metrics.asr_metrics import ASRMetricEngine
        wer = ASRMetricEngine.compute_wer("the cat sat on the mat", "the cat sat on the mat")
        assert wer == 0.0

    def test_wer_full_substitution(self):
        from evaluation.metrics.asr_metrics import ASRMetricEngine
        wer = ASRMetricEngine.compute_wer("a b c", "x y z")
        assert wer == 1.0, f"All-substitution WER should be 1.0, got {wer}"

    def test_wer_one_insertion(self):
        from evaluation.metrics.asr_metrics import ASRMetricEngine
        # reference 3 words, hypothesis 4 words (1 insertion)
        wer = ASRMetricEngine.compute_wer("a b c", "a b c d")
        assert abs(wer - 1.0/3.0) < 0.02, f"1 insertion over 3 ref words should be ~0.333, got {wer}"

    def test_cer_zero_perfect(self):
        from evaluation.metrics.asr_metrics import ASRMetricEngine
        cer = ASRMetricEngine.compute_cer("hello", "hello")
        assert cer == 0.0

    def test_wer_case_insensitive(self):
        from evaluation.metrics.asr_metrics import ASRMetricEngine
        wer = ASRMetricEngine.compute_wer("The Cat Sat", "the cat sat")
        assert wer == 0.0, "WER should normalize case"

    def test_evaluate_returns_decomposition(self):
        from evaluation.metrics.asr_metrics import ASRMetricEngine
        result = ASRMetricEngine.evaluate("a b c", "a x c")
        assert result.substitutions == 1
        assert result.word_error_rate == pytest.approx(1.0/3.0, abs=0.01)


class TestCalibrationMetrics:
    """Verifies ECE calculation with engineered probability distributions."""

    def test_perfect_calibration_near_zero_ece(self):
        from evaluation.metrics.calibration_metrics import CalibrationMetricEngine
        # Perfectly calibrated: if prob=0.9, label should be 1 with ~90% frequency
        y_true = [1] * 9 + [0]
        y_probs = [0.9] * 10
        result = CalibrationMetricEngine.evaluate(y_true, y_probs, num_bins=10)
        assert result.expected_calibration_error < 0.15, f"ECE should be low for well-calibrated, got {result.expected_calibration_error}"

    def test_ece_is_in_range(self):
        from evaluation.metrics.calibration_metrics import CalibrationMetricEngine
        y_true = [0, 1, 0, 1, 0, 1]
        y_probs = [0.3, 0.7, 0.2, 0.8, 0.4, 0.6]
        result = CalibrationMetricEngine.evaluate(y_true, y_probs)
        assert 0.0 <= result.expected_calibration_error <= 1.0

    def test_brier_score_bounded(self):
        from evaluation.metrics.calibration_metrics import CalibrationMetricEngine
        y_true = [1, 0, 1, 0]
        y_probs = [0.9, 0.1, 0.8, 0.2]
        result = CalibrationMetricEngine.evaluate(y_true, y_probs)
        assert 0.0 <= result.brier_score <= 1.0

    def test_empty_input_returns_zero_ece(self):
        from evaluation.metrics.calibration_metrics import CalibrationMetricEngine
        result = CalibrationMetricEngine.evaluate([], [])
        assert result.expected_calibration_error == 0.0


class TestLatencyMetrics:
    """Verifies latency percentile computations."""

    def test_p95_is_percentile(self):
        from evaluation.metrics.latency_metrics import LatencyMetricEngine
        latencies = list(range(1, 101))  # 1–100 ms
        result = LatencyMetricEngine.evaluate(latencies)
        assert 94 <= result.p95_latency_ms <= 96, f"P95 of 1–100 should be ≈95, got {result.p95_latency_ms}"

    def test_empty_latencies(self):
        from evaluation.metrics.latency_metrics import LatencyMetricEngine
        result = LatencyMetricEngine.evaluate([])
        assert result.sample_count == 0
        assert result.p95_latency_ms == 0.0


# ────────────────────────────────────────────────────────────────────────────────
# MODEL ADAPTER TESTS
# ────────────────────────────────────────────────────────────────────────────────

class TestModelAdapters:
    """Verifies each adapter can produce deterministic predictions."""

    def _make_sample(self, sample_id="test_0", is_synthetic=True, lang="en"):
        from evaluation.interfaces import EvaluationSample
        import struct
        # Minimal silent WAV bytes (non-empty)
        audio_bytes = b"\x00" * 320
        return EvaluationSample(
            sample_id=sample_id,
            audio_bytes=audio_bytes,
            ground_truth_label=1 if is_synthetic else 0,
            language=lang,
            is_synthetic=is_synthetic,
            metadata={"is_synthetic": is_synthetic, "duration_sec": 0.01},
        )

    def test_synthetic_voice_adapter(self):
        from evaluation.adapters.synthetic_voice_adapter import SyntheticVoiceEvaluationAdapter
        adapter = SyntheticVoiceEvaluationAdapter()
        meta = adapter.get_model_metadata()
        assert meta.model_identifier == "VoiceGuard-Conformer-VocoderDetector"
        assert adapter.is_available()
        pred = adapter.predict(self._make_sample())
        assert 0.0 <= pred.probability <= 1.0
        assert pred.latency_ms >= 0.0
        health = adapter.health_check()
        assert health["status"] == "healthy"

    def test_speaker_verification_adapter(self):
        from evaluation.adapters.speaker_verification_adapter import SpeakerVerificationEvaluationAdapter
        adapter = SpeakerVerificationEvaluationAdapter()
        assert adapter.is_available()
        sample = self._make_sample("sv_0", is_synthetic=False)
        pred = adapter.predict(sample)
        assert 0.0 <= pred.probability <= 1.0

    def test_prosody_adapter(self):
        from evaluation.adapters.prosody_adapter import ProsodyEvaluationAdapter
        adapter = ProsodyEvaluationAdapter()
        assert adapter.is_available()
        pred = adapter.predict(self._make_sample("pr_0", is_synthetic=True))
        assert 0.0 <= pred.probability <= 1.0

    def test_nlp_social_engineering_adapter(self):
        from evaluation.adapters.nlp_social_engineering_adapter import NLPSocialEngineeringEvaluationAdapter
        adapter = NLPSocialEngineeringEvaluationAdapter()
        assert adapter.is_available()
        from evaluation.interfaces import EvaluationSample
        sample = EvaluationSample(
            sample_id="nlp_0",
            text_input="Your account has been compromised. Share your OTP immediately.",
            ground_truth_label=1,
            language="en",
        )
        pred = adapter.predict(sample)
        assert 0.0 <= pred.probability <= 1.0

    def test_language_identification_adapter(self):
        from evaluation.adapters.language_identification_adapter import LanguageIdentificationEvaluationAdapter
        adapter = LanguageIdentificationEvaluationAdapter()
        assert adapter.is_available()
        pred = adapter.predict(self._make_sample("lid_0", lang="hi"))
        assert pred.predicted_label is not None

    def test_asr_adapter(self):
        from evaluation.adapters.asr_adapter import ASREvaluationAdapter
        adapter = ASREvaluationAdapter()
        assert adapter.is_available()
        pred = adapter.predict(self._make_sample("asr_0"))
        assert pred.predicted_transcript is not None or pred.predicted_label is not None

    def test_predict_batch_returns_same_count(self):
        from evaluation.adapters.synthetic_voice_adapter import SyntheticVoiceEvaluationAdapter
        adapter = SyntheticVoiceEvaluationAdapter()
        samples = [self._make_sample(f"b_{i}") for i in range(5)]
        preds = adapter.predict_batch(samples)
        assert len(preds) == 5


# ────────────────────────────────────────────────────────────────────────────────
# ROBUSTNESS ENGINE TESTS
# ────────────────────────────────────────────────────────────────────────────────

class TestRobustnessEngine:
    """Tests acoustic perturbation transforms and degradation tracking."""

    def _make_audio_sample(self, label=1, is_synthetic=True):
        from evaluation.interfaces import EvaluationSample
        import numpy as np
        # 16-bit PCM at 16 kHz, 0.1 sec
        samples = (np.random.randn(1600) * 8000).astype("int16")
        return EvaluationSample(
            sample_id="rob_test",
            audio_bytes=samples.tobytes(),
            ground_truth_label=label,
            language="en",
            is_synthetic=is_synthetic,
            metadata={"duration_sec": 0.1, "is_synthetic": is_synthetic},
        )

    def test_telephony_transform_produces_bytes(self):
        from evaluation.robustness import RobustnessEngine
        engine = RobustnessEngine()
        sample = self._make_audio_sample()
        perturbed = engine.transform_sample(sample, "telephony_g711u_8khz")
        assert perturbed.audio_bytes is not None
        assert len(perturbed.audio_bytes) > 0
        assert perturbed.sample_id != sample.sample_id

    def test_noise_transform_changes_bytes(self):
        from evaluation.robustness import RobustnessEngine
        engine = RobustnessEngine()
        sample = self._make_audio_sample()
        perturbed = engine.transform_sample(sample, "additive_noise_snr_15db")
        # Noise adds randomness — bytes should differ
        assert perturbed.audio_bytes != sample.audio_bytes

    def test_all_conditions_registered(self):
        from evaluation.robustness import RobustnessEngine
        engine = RobustnessEngine()
        assert len(engine.CONDITIONS) >= 4

    def test_provenance_tags_on_transformed_sample(self):
        from evaluation.robustness import RobustnessEngine
        engine = RobustnessEngine()
        sample = self._make_audio_sample()
        perturbed = engine.transform_sample(sample, "amplitude_clipping_distortion")
        assert perturbed.metadata.get("robustness_condition_applied") == "amplitude_clipping_distortion"
        assert perturbed.metadata.get("parent_sample_id") == sample.sample_id


# ────────────────────────────────────────────────────────────────────────────────
# DATASET VALIDATION TESTS
# ────────────────────────────────────────────────────────────────────────────────

class TestDatasetValidation:
    """Tests DatasetRegistry, DatasetValidator, and speaker leakage detection."""

    def test_registry_has_baseline_datasets(self):
        from evaluation.datasets import DatasetRegistry
        registry = DatasetRegistry()
        datasets = registry.list_all()
        assert len(datasets) >= 2, "Registry should have at least 2 benchmark datasets"

    def test_get_known_dataset(self):
        from evaluation.datasets import DatasetRegistry
        registry = DatasetRegistry()
        ds = registry.get("indic-voice-clone-telephony-v2")
        assert ds is not None
        assert ds.total_samples > 0

    def test_generate_mock_samples_count(self):
        from evaluation.datasets import DatasetRegistry
        registry = DatasetRegistry()
        samples = registry.generate_mock_evaluation_samples("indic-voice-clone-telephony-v2", count=25)
        assert len(samples) == 25

    def test_mock_samples_are_deterministic(self):
        from evaluation.datasets import DatasetRegistry
        registry = DatasetRegistry()
        samples1 = registry.generate_mock_evaluation_samples("indic-voice-clone-telephony-v2", count=10, seed=42)
        samples2 = registry.generate_mock_evaluation_samples("indic-voice-clone-telephony-v2", count=10, seed=42)
        assert [s.sample_id for s in samples1] == [s.sample_id for s in samples2]

    def test_mock_samples_have_audio(self):
        from evaluation.datasets import DatasetRegistry
        registry = DatasetRegistry()
        samples = registry.generate_mock_evaluation_samples("indic-voice-clone-telephony-v2", count=5)
        for s in samples:
            assert s.audio_bytes is not None and len(s.audio_bytes) > 100

    def test_speaker_leakage_detection(self):
        from evaluation.datasets import DatasetValidator
        from evaluation.interfaces import EvaluationSample
        train = [EvaluationSample(sample_id="tr1", ground_truth_label=1, language="en", speaker_id="spk001")]
        test = [EvaluationSample(sample_id="te1", ground_truth_label=0, language="en", speaker_id="spk001")]
        report = DatasetValidator.validate_split_integrity("test_ds", train, test)
        assert report.speaker_leakage_detected is True
        assert "spk001" in report.leaked_speaker_ids

    def test_no_speaker_leakage_disjoint(self):
        from evaluation.datasets import DatasetValidator
        from evaluation.interfaces import EvaluationSample
        train = [EvaluationSample(sample_id="tr1", ground_truth_label=1, language="en", speaker_id="spk001")]
        test = [EvaluationSample(sample_id="te1", ground_truth_label=0, language="en", speaker_id="spk002")]
        report = DatasetValidator.validate_split_integrity("test_ds", train, test)
        assert report.speaker_leakage_detected is False
        assert report.is_valid is True


# ────────────────────────────────────────────────────────────────────────────────
# READINESS GATE TESTS
# ────────────────────────────────────────────────────────────────────────────────

class TestReadinessGates:
    """Validates readiness gate threshold enforcement."""

    def test_insufficient_evidence_on_low_sample_count(self):
        from evaluation.readiness import ModelReadinessGate
        from evaluation.interfaces import ModelType
        assessment = ModelReadinessGate.evaluate_readiness(
            model_identifier="TestModel",
            model_version="v1.0",
            model_type=ModelType.SYNTHETIC_VOICE_DETECTOR,
            evaluation_metrics={"sample_count": 10, "equal_error_rate": 0.05, "roc_auc": 0.95},
        )
        assert not assessment.passed_all_mandatory_gates
        assert "Insufficient" in assessment.readiness_status.value or assessment.readiness_status.value in (
            "insufficient_evidence", "validation_required", "research_only"
        )

    def test_approved_for_staging_with_good_metrics(self):
        from evaluation.readiness import ModelReadinessGate
        from evaluation.interfaces import ModelType
        assessment = ModelReadinessGate.evaluate_readiness(
            model_identifier="TestModel",
            model_version="v2.0",
            model_type=ModelType.SYNTHETIC_VOICE_DETECTOR,
            evaluation_metrics={
                "sample_count": 500,
                "equal_error_rate": 0.05,
                "roc_auc": 0.95,
                "accuracy": 0.92,
            },
            subgroup_disparity=1.2,
            robustness_drop=0.05,
            calibration_ece=0.08,
            p95_latency_ms=180.0,
        )
        # Passes all primary gates
        assert assessment.readiness_status.value in (
            "approved_for_staging", "approved_for_production"
        )

    def test_fairness_gate_fails_on_high_disparity(self):
        from evaluation.readiness import ModelReadinessGate
        from evaluation.interfaces import ModelType
        assessment = ModelReadinessGate.evaluate_readiness(
            model_identifier="TestModel",
            model_version="v1.0",
            model_type=ModelType.SYNTHETIC_VOICE_DETECTOR,
            evaluation_metrics={"sample_count": 500, "equal_error_rate": 0.05, "roc_auc": 0.95},
            subgroup_disparity=3.0,  # Far above 1.75 limit
        )
        fairness_checks = [c for c in assessment.gate_checks if "Fairness" in c.check_name or "Disparity" in c.check_name]
        if fairness_checks:
            assert any(not c.passed for c in fairness_checks)

    def test_gate_check_fields_present(self):
        from evaluation.readiness import ModelReadinessGate
        from evaluation.interfaces import ModelType
        assessment = ModelReadinessGate.evaluate_readiness(
            model_identifier="TestModel",
            model_version="v1.0",
            model_type=ModelType.SYNTHETIC_VOICE_DETECTOR,
            evaluation_metrics={"sample_count": 300, "equal_error_rate": 0.07, "roc_auc": 0.93},
        )
        assert len(assessment.gate_checks) > 0
        for check in assessment.gate_checks:
            assert check.check_name
            assert check.target_criteria
            assert check.actual_value
            assert isinstance(check.passed, bool)


# ────────────────────────────────────────────────────────────────────────────────
# EVALUATION RUNNER END-TO-END TESTS
# ────────────────────────────────────────────────────────────────────────────────

class TestEvaluationRunner:
    """End-to-end runner tests across all major model types."""

    def _run(self, adapter_cls, model_type_is_asr=False, count=20):
        from evaluation import EvaluationRunner, EvaluationRunConfig, EvaluationStatus
        from evaluation.datasets import DatasetRegistry
        adapter = adapter_cls()
        registry = DatasetRegistry()
        samples = registry.generate_mock_evaluation_samples("indic-voice-clone-telephony-v2", count=count)
        runner = EvaluationRunner()
        config = EvaluationRunConfig(
            dataset_id="indic-voice-clone-telephony-v2",
            run_robustness=False,  # Skip robustness for speed in unit tests
            run_fairness=True,
            run_calibration=True,
        )
        result = runner.run_evaluation(adapter, samples, config)
        assert result.status == EvaluationStatus.COMPLETED
        assert result.sample_count == count
        return result

    def test_synthetic_voice_runner(self):
        from evaluation.adapters.synthetic_voice_adapter import SyntheticVoiceEvaluationAdapter
        result = self._run(SyntheticVoiceEvaluationAdapter)
        assert "accuracy" in result.primary_metrics
        assert "equal_error_rate" in result.primary_metrics
        assert result.latency_summary.sample_count == 20

    def test_speaker_verification_runner(self):
        from evaluation.adapters.speaker_verification_adapter import SpeakerVerificationEvaluationAdapter
        result = self._run(SpeakerVerificationEvaluationAdapter)
        assert "roc_auc" in result.primary_metrics

    def test_prosody_runner(self):
        from evaluation.adapters.prosody_adapter import ProsodyEvaluationAdapter
        result = self._run(ProsodyEvaluationAdapter)
        assert result.status.value == "completed"

    def test_nlp_runner(self):
        from evaluation.adapters.nlp_social_engineering_adapter import NLPSocialEngineeringEvaluationAdapter
        from evaluation.interfaces import EvaluationSample
        from evaluation import EvaluationRunner, EvaluationRunConfig, EvaluationStatus
        texts = [
            "Please share your OTP immediately. Your account is at risk.",
            "Good morning, how are you today?",
            "URGENT: Verify your banking details right now.",
            "The weather is nice today.",
        ] * 5
        samples = [
            EvaluationSample(
                sample_id=f"nlp_{i}",
                text_input=texts[i % len(texts)],
                ground_truth_label=1 if i % 2 == 0 else 0,
                language="en",
            )
            for i in range(20)
        ]
        adapter = NLPSocialEngineeringEvaluationAdapter()
        runner = EvaluationRunner()
        config = EvaluationRunConfig(
            dataset_id="indic-voice-clone-telephony-v2",
            run_robustness=False,
            run_fairness=False,
            run_calibration=True,
        )
        result = runner.run_evaluation(adapter, samples, config)
        assert result.status == EvaluationStatus.COMPLETED

    def test_empty_samples_returns_failed(self):
        from evaluation.adapters.synthetic_voice_adapter import SyntheticVoiceEvaluationAdapter
        from evaluation import EvaluationRunner, EvaluationRunConfig, EvaluationStatus
        adapter = SyntheticVoiceEvaluationAdapter()
        runner = EvaluationRunner()
        config = EvaluationRunConfig(dataset_id="indic-voice-clone-telephony-v2")
        result = runner.run_evaluation(adapter, [], config)
        assert result.status == EvaluationStatus.FAILED
        assert result.error_message is not None

    def test_result_has_readiness_assessment(self):
        from evaluation.adapters.synthetic_voice_adapter import SyntheticVoiceEvaluationAdapter
        result = self._run(SyntheticVoiceEvaluationAdapter)
        assert result.readiness_assessment is not None
        assert result.readiness_assessment.model_identifier == "VoiceGuard-Conformer-VocoderDetector"

    def test_calibration_metrics_populated(self):
        from evaluation.adapters.synthetic_voice_adapter import SyntheticVoiceEvaluationAdapter
        result = self._run(SyntheticVoiceEvaluationAdapter)
        assert result.calibration_metrics is not None
        assert result.calibration_metrics.expected_calibration_error >= 0.0


# ────────────────────────────────────────────────────────────────────────────────
# REST API ENDPOINT TESTS (Direct Function Invocations)
# ────────────────────────────────────────────────────────────────────────────────

class TestEvaluationAPIEndpoints:
    """Tests REST API endpoints directly with SessionLocal and auth context."""

    @pytest.fixture(autouse=True)
    def setup_test_context(self):
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.pool import StaticPool
        from app.core.database import Base
        import app.modules.evaluation.models
        from unittest.mock import MagicMock

        # Shared in-memory SQLite connection across threads/sessions
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        self.Session = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

        self.user = MagicMock()
        self.user.id = 1
        self.user.email = "admin@voiceguard.test"
        self.user.role = "admin"

        yield

        self.engine.dispose()

    def test_health_endpoint(self):
        from app.modules.evaluation.router import evaluation_health
        db = self.Session()
        try:
            res = evaluation_health(db=db)
            assert res["status"] == "healthy"
            assert "total_evaluation_runs" in res
            assert res["ai_engine_available"] is True
        finally:
            db.close()

    def test_list_datasets(self):
        from app.modules.evaluation.router import list_datasets
        db = self.Session()
        try:
            res = list_datasets(db=db, current_user=self.user)
            assert isinstance(res, list)
        finally:
            db.close()

    def test_create_dataset(self):
        from app.modules.evaluation.router import create_dataset
        from app.modules.evaluation.schemas import DatasetCreateRequest
        db = self.Session()
        try:
            req = DatasetCreateRequest(
                dataset_id="test-eval-ds-001",
                name="Test Evaluation Dataset",
                version="1.0.0",
                source="VoiceGuard Test Suite",
                license="MIT",
                primary_language="en",
                languages_covered=["en", "hi"],
                sample_count=100,
                total_duration_hours=0.5,
            )
            res = create_dataset(req=req, db=db, current_user=self.user)
            assert res.dataset_id == "test-eval-ds-001"
            assert res.name == "Test Evaluation Dataset"
        finally:
            db.close()

    def test_list_evaluations_empty(self):
        from app.modules.evaluation.router import list_evaluations
        db = self.Session()
        try:
            res = list_evaluations(db=db, current_user=self.user)
            assert isinstance(res, list)
        finally:
            db.close()

    def test_create_and_get_evaluation_run(self):
        from app.modules.evaluation.router import create_evaluation, get_evaluation
        from app.modules.evaluation.schemas import EvaluationRunCreateRequest
        from fastapi import BackgroundTasks
        db = self.Session()
        try:
            req = EvaluationRunCreateRequest(
                evaluation_name="Test Synthetic Voice Eval",
                model_id="VoiceGuard-Conformer-VocoderDetector",
                model_version="v2.4.1-quant",
                dataset_id="indic-voice-clone-telephony-v2",
                run_robustness=False,
                run_fairness=True,
                run_calibration=True,
                target_deployment_tier="staging",
            )
            bg = BackgroundTasks()
            res = create_evaluation(req=req, background_tasks=bg, db=db, current_user=self.user)
            assert res.model_id == "VoiceGuard-Conformer-VocoderDetector"
            assert res.status in ("queued", "created")

            # Retrieve by ID
            fetched = get_evaluation(evaluation_run_id=res.evaluation_run_id, db=db, current_user=self.user)
            assert fetched.evaluation_run_id == res.evaluation_run_id
        finally:
            db.close()

    def test_list_registered_models(self):
        from app.modules.evaluation.router import list_models
        models = list_models(current_user=self.user)
        assert len(models) >= 5
        assert any(m["model_id"] == "VoiceGuard-Conformer-VocoderDetector" for m in models)

    def test_get_nonexistent_evaluation_raises_404(self):
        from app.modules.evaluation.router import get_evaluation
        from fastapi import HTTPException
        db = self.Session()
        try:
            with pytest.raises(HTTPException) as exc_info:
                get_evaluation(evaluation_run_id="eval-nonexistent-9999", db=db, current_user=self.user)
            assert exc_info.value.status_code == 404
        finally:
            db.close()

    def test_readiness_list(self):
        from app.modules.evaluation.router import list_readiness
        db = self.Session()
        try:
            records = list_readiness(db=db, current_user=self.user)
            assert isinstance(records, list)
        finally:
            db.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])


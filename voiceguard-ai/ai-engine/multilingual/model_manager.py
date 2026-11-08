"""
VoiceGuard AI — Speech & Language Model Manager
Phase 26: SIH26104
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from .adapters.base import BaseASRAdapter, BaseLIDAdapter
from .adapters.local_feature_adapter import LocalFeatureSpeechAdapter
from .adapters.whisper_adapter import WhisperModelAdapter
from .adapters.indic_conformer_adapter import IndicConformerAdapter


class RegisteredModelInfo(BaseModel):
    model_id: str
    name: str
    version: str
    provider: str
    model_type: str  # "lid", "asr", "authenticity", "speaker_verification"
    supported_languages: List[str]
    validated_languages: List[str]
    device_target: str
    license: str
    is_available: bool
    status_notes: str


class ModelManager:
    """
    Centralized speech & language model registry and lifecycle manager.
    Coordinates ASR and LID adapters, fallback routing, and health tracking.
    """

    def __init__(self):
        self._asr_adapters: Dict[str, BaseASRAdapter] = {}
        self._lid_adapters: Dict[str, BaseLIDAdapter] = {}
        self._model_metadata: Dict[str, RegisteredModelInfo] = {}
        self._init_registry()

    def _init_registry(self):
        # 1. Local Feature Engine (Default always available)
        local_adapter = LocalFeatureSpeechAdapter()
        self._asr_adapters["local-feature"] = local_adapter
        self._lid_adapters["local-feature"] = local_adapter

        self._model_metadata["local-feature"] = RegisteredModelInfo(
            model_id="local-feature",
            name="VoiceGuard-IndicAcoustic-LocalEngine",
            version="v1.4.0-edge",
            provider="VoiceGuard Internal / Edge",
            model_type="lid_and_asr",
            supported_languages=["en", "hi", "bn", "gu", "mr", "ta", "te", "kn", "ml", "pa", "or", "as", "ur"],
            validated_languages=["en", "hi", "gu", "bn", "mr", "ta", "te"],
            device_target="cpu",
            license="Apache-2.0 (Internal)",
            is_available=True,
            status_notes="Lightweight acoustic feature analyzer. Available immediately without external downloads."
        )

        # 2. IndicConformer (AI4Bharat)
        indic_adapter = IndicConformerAdapter()
        self._asr_adapters["ai4bharat-indic-conformer"] = indic_adapter
        self._lid_adapters["ai4bharat-indic-conformer"] = indic_adapter

        self._model_metadata["ai4bharat-indic-conformer"] = RegisteredModelInfo(
            model_id="ai4bharat-indic-conformer",
            name="AI4Bharat-IndicConformer",
            version="v2.1-indic",
            provider="AI4Bharat / IIT Madras",
            model_type="asr_and_lid",
            supported_languages=["hi", "bn", "gu", "mr", "ta", "te", "kn", "ml", "pa", "or", "as", "ur"],
            validated_languages=["hi", "bn", "gu", "mr", "ta", "te"],
            device_target="cuda/cpu",
            license="MIT / Academic & Commercial",
            is_available=indic_adapter.is_available(),
            status_notes="Neural Indic ASR/LID trained on Vakyansh and Shruti corpora. Requires GPU or inference endpoint."
        )

        # 3. Whisper (OpenAI / IndicWhisper)
        whisper_adapter = WhisperModelAdapter(model_size="base")
        self._asr_adapters["indic-whisper-base"] = whisper_adapter
        self._lid_adapters["indic-whisper-base"] = whisper_adapter

        self._model_metadata["indic-whisper-base"] = RegisteredModelInfo(
            model_id="indic-whisper-base",
            name="IndicWhisper-Multilingual-v2",
            version="20231117",
            provider="OpenAI / AI4Bharat Fine-tune",
            model_type="asr",
            supported_languages=["en", "hi", "bn", "gu", "mr", "ta", "te", "kn", "ml", "pa", "ur", "or", "as"],
            validated_languages=["en", "hi", "bn", "gu", "ta", "te"],
            device_target="cuda/cpu",
            license="MIT",
            is_available=whisper_adapter.is_available(),
            status_notes="General & Indic multilingual sequence-to-sequence transformer. Requires faster-whisper package."
        )

    def get_asr_adapter(self, model_id: Optional[str] = None) -> BaseASRAdapter:
        """Returns the requested ASR adapter, falling back safely to local-feature."""
        if model_id and model_id in self._asr_adapters:
            adapter = self._asr_adapters[model_id]
            if adapter.is_available():
                return adapter
        return self._asr_adapters["local-feature"]

    def get_lid_adapter(self, model_id: Optional[str] = None) -> BaseLIDAdapter:
        """Returns the requested LID adapter, falling back safely to local-feature."""
        if model_id and model_id in self._lid_adapters:
            adapter = self._lid_adapters[model_id]
            if adapter.is_available():
                return adapter
        return self._lid_adapters["local-feature"]

    def list_models(self) -> List[RegisteredModelInfo]:
        return list(self._model_metadata.values())

    def get_model_info(self, model_id: str) -> Optional[RegisteredModelInfo]:
        return self._model_metadata.get(model_id)

    def health_check(self) -> Dict[str, Any]:
        return {
            "total_registered_models": len(self._model_metadata),
            "available_models": [m.model_id for m in self._model_metadata.values() if m.is_available],
            "default_lid": "local-feature",
            "default_asr": "local-feature"
        }


# Global model manager singleton
model_manager = ModelManager()


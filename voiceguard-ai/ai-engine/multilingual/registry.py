"""
VoiceGuard AI — Language Support Registry
Phase 26: SIH26104
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class SupportStatus(str, Enum):
    """Categorization of model validation and operational coverage."""
    SUPPORTED = "supported"                     # Fully validated with benchmarks & models
    PARTIALLY_SUPPORTED = "partially_supported" # Baseline models configured; regional dialects limited
    UNSUPPORTED = "unsupported"                 # Outside current validated operational domain
    UNKNOWN = "unknown"                         # Unclassified or unidentifiable acoustic signal
    MIXED = "mixed"                             # Code-switched or multi-lingual segment
    LOW_CONFIDENCE = "low_confidence"           # Classification below acceptable certainty threshold


class LanguageMetadata(BaseModel):
    """Metadata schema defining language capability and validation criteria."""
    code: str = Field(..., description="ISO 639-1 or 639-3 language code")
    name: str = Field(..., description="English canonical name")
    native_name: str = Field(..., description="Autonym in native script")
    native_script: str = Field(..., description="Primary writing script")
    transliteration_scripts: List[str] = Field(default_factory=list, description="Common romanized/informal scripts")
    supported_asr_models: List[str] = Field(default_factory=list, description="Configured ASR model IDs")
    supported_lid_models: List[str] = Field(default_factory=list, description="Configured LID model IDs")
    status: SupportStatus = Field(default=SupportStatus.SUPPORTED)
    min_confidence_threshold: float = Field(default=0.65, description="Minimum LID score to accept")
    enabled: bool = Field(default=True)
    code_switching_pairs: List[str] = Field(default_factory=list, description="Common mixed language pairs")
    notes: Optional[str] = None


class LanguageRegistry:
    """Configurable central registry for supported languages and dialects."""

    def __init__(self):
        self._languages: Dict[str, LanguageMetadata] = {}
        self._init_defaults()

    def _init_defaults(self):
        """Pre-populate the 13 foundational Indian languages + Indian English."""
        defaults = [
            LanguageMetadata(
                code="en",
                name="English",
                native_name="English",
                native_script="Latin",
                transliteration_scripts=["Latin"],
                supported_asr_models=["IndicWhisper-Multilingual-v2", "OpenAI-Whisper-Base", "IndicConformer-HiEn"],
                supported_lid_models=["IndicLID-Conformer-v1", "FastText-LID-176"],
                status=SupportStatus.SUPPORTED,
                min_confidence_threshold=0.65,
                enabled=True,
                code_switching_pairs=["hi", "gu", "bn", "ta", "te"],
                notes="Covers General Indian English and regional L1-influenced English accents."
            ),
            LanguageMetadata(
                code="hi",
                name="Hindi",
                native_name="हिन्दी",
                native_script="Devanagari",
                transliteration_scripts=["Latin (Hinglish)"],
                supported_asr_models=["IndicWhisper-Multilingual-v2", "AI4Bharat-IndicConformer-Hi"],
                supported_lid_models=["IndicLID-Conformer-v1", "FastText-LID-176"],
                status=SupportStatus.SUPPORTED,
                min_confidence_threshold=0.65,
                enabled=True,
                code_switching_pairs=["en", "ur", "pa"],
                notes="Primary benchmark coverage for both pure Hindi and colloquial Hinglish."
            ),
            LanguageMetadata(
                code="bn",
                name="Bengali",
                native_name="বাংলা",
                native_script="Bengali",
                transliteration_scripts=["Latin (Banglish)"],
                supported_asr_models=["IndicWhisper-Multilingual-v2", "AI4Bharat-IndicConformer-Bn"],
                supported_lid_models=["IndicLID-Conformer-v1"],
                status=SupportStatus.SUPPORTED,
                min_confidence_threshold=0.65,
                enabled=True,
                code_switching_pairs=["en", "hi", "as"],
                notes="Validated across Eastern regional accents and Banglish conversational speech."
            ),
            LanguageMetadata(
                code="gu",
                name="Gujarati",
                native_name="ગુજરાતી",
                native_script="Gujarati",
                transliteration_scripts=["Latin (Gujlish)"],
                supported_asr_models=["IndicWhisper-Multilingual-v2", "AI4Bharat-IndicConformer-Gu"],
                supported_lid_models=["IndicLID-Conformer-v1"],
                status=SupportStatus.SUPPORTED,
                min_confidence_threshold=0.65,
                enabled=True,
                code_switching_pairs=["en", "hi"],
                notes="Validated on Western commercial financial dialogues & Gujlish code-switching."
            ),
            LanguageMetadata(
                code="mr",
                name="Marathi",
                native_name="मराठी",
                native_script="Devanagari",
                transliteration_scripts=["Latin"],
                supported_asr_models=["IndicWhisper-Multilingual-v2", "AI4Bharat-IndicConformer-Mr"],
                supported_lid_models=["IndicLID-Conformer-v1"],
                status=SupportStatus.SUPPORTED,
                min_confidence_threshold=0.65,
                enabled=True,
                code_switching_pairs=["en", "hi"],
                notes="High acoustic similarity to Hindi; validated on Western Maharashtra speech corpora."
            ),
            LanguageMetadata(
                code="ta",
                name="Tamil",
                native_name="தமிழ்",
                native_script="Tamil",
                transliteration_scripts=["Latin (Tanglish)"],
                supported_asr_models=["IndicWhisper-Multilingual-v2", "AI4Bharat-IndicConformer-Ta"],
                supported_lid_models=["IndicLID-Conformer-v1"],
                status=SupportStatus.SUPPORTED,
                min_confidence_threshold=0.65,
                enabled=True,
                code_switching_pairs=["en"],
                notes="Validated with Dravidian acoustic models and urban Tanglish speech."
            ),
            LanguageMetadata(
                code="te",
                name="Telugu",
                native_name="తెలుగు",
                native_script="Telugu",
                transliteration_scripts=["Latin"],
                supported_asr_models=["IndicWhisper-Multilingual-v2", "AI4Bharat-IndicConformer-Te"],
                supported_lid_models=["IndicLID-Conformer-v1"],
                status=SupportStatus.SUPPORTED,
                min_confidence_threshold=0.65,
                enabled=True,
                code_switching_pairs=["en", "hi"],
                notes="Validated on Telangana and Andhra Pradesh regional conversational audio."
            ),
            LanguageMetadata(
                code="kn",
                name="Kannada",
                native_name="ಕನ್ನಡ",
                native_script="Kannada",
                transliteration_scripts=["Latin (Kanglish)"],
                supported_asr_models=["IndicWhisper-Multilingual-v2", "AI4Bharat-IndicConformer-Kn"],
                supported_lid_models=["IndicLID-Conformer-v1"],
                status=SupportStatus.SUPPORTED,
                min_confidence_threshold=0.65,
                enabled=True,
                code_switching_pairs=["en"],
                notes="Covers Bangalore urban multilingual code-switching."
            ),
            LanguageMetadata(
                code="ml",
                name="Malayalam",
                native_name="മലയാളം",
                native_script="Malayalam",
                transliteration_scripts=["Latin (Manglish)"],
                supported_asr_models=["IndicWhisper-Multilingual-v2", "AI4Bharat-IndicConformer-Ml"],
                supported_lid_models=["IndicLID-Conformer-v1"],
                status=SupportStatus.SUPPORTED,
                min_confidence_threshold=0.65,
                enabled=True,
                code_switching_pairs=["en"],
                notes="Validated on standard Kerala regional speech."
            ),
            LanguageMetadata(
                code="pa",
                name="Punjabi",
                native_name="ਪੰਜਾਬੀ",
                native_script="Gurmukhi",
                transliteration_scripts=["Shahmukhi", "Latin"],
                supported_asr_models=["IndicWhisper-Multilingual-v2", "AI4Bharat-IndicConformer-Pa"],
                supported_lid_models=["IndicLID-Conformer-v1"],
                status=SupportStatus.SUPPORTED,
                min_confidence_threshold=0.65,
                enabled=True,
                code_switching_pairs=["en", "hi"],
                notes="Tonal characteristics evaluated to prevent false synthetic-voice flags."
            ),
            LanguageMetadata(
                code="or",
                name="Odia",
                native_name="ଓଡ଼ିଆ",
                native_script="Odia",
                transliteration_scripts=["Latin"],
                supported_asr_models=["IndicWhisper-Multilingual-v2"],
                supported_lid_models=["IndicLID-Conformer-v1"],
                status=SupportStatus.PARTIALLY_SUPPORTED,
                min_confidence_threshold=0.60,
                enabled=True,
                code_switching_pairs=["en", "hi"],
                notes="Partially supported: baseline ASR available, regional dialect coverage ongoing."
            ),
            LanguageMetadata(
                code="as",
                name="Assamese",
                native_name="অসমীয়া",
                native_script="Bengali-Assamese",
                transliteration_scripts=["Latin"],
                supported_asr_models=["IndicWhisper-Multilingual-v2"],
                supported_lid_models=["IndicLID-Conformer-v1"],
                status=SupportStatus.PARTIALLY_SUPPORTED,
                min_confidence_threshold=0.60,
                enabled=True,
                code_switching_pairs=["en", "bn"],
                notes="Partially supported: phonetic overlap with Bengali handled with soft priors."
            ),
            LanguageMetadata(
                code="ur",
                name="Urdu",
                native_name="اردو",
                native_script="Perso-Arabic (Nastaliq)",
                transliteration_scripts=["Devanagari", "Latin"],
                supported_asr_models=["IndicWhisper-Multilingual-v2", "AI4Bharat-IndicConformer-Ur"],
                supported_lid_models=["IndicLID-Conformer-v1"],
                status=SupportStatus.SUPPORTED,
                min_confidence_threshold=0.65,
                enabled=True,
                code_switching_pairs=["en", "hi"],
                notes="Syntactically aligned with Hindi in colloquial registers."
            ),
        ]
        for item in defaults:
            self._languages[item.code] = item

    def get(self, code: str) -> Optional[LanguageMetadata]:
        return self._languages.get(code.lower().strip())

    def list_all(self) -> List[LanguageMetadata]:
        return list(self._languages.values())

    def list_supported(self) -> List[LanguageMetadata]:
        return [
            lang for lang in self._languages.values()
            if lang.enabled and lang.status in (SupportStatus.SUPPORTED, SupportStatus.PARTIALLY_SUPPORTED)
        ]

    def is_supported(self, code: str) -> bool:
        meta = self.get(code)
        if not meta or not meta.enabled:
            return False
        return meta.status in (SupportStatus.SUPPORTED, SupportStatus.PARTIALLY_SUPPORTED)

    def resolve_status(self, code: str, confidence: float) -> SupportStatus:
        meta = self.get(code)
        if not meta:
            return SupportStatus.UNSUPPORTED
        if not meta.enabled:
            return SupportStatus.UNSUPPORTED
        if confidence < meta.min_confidence_threshold:
            return SupportStatus.LOW_CONFIDENCE
        return meta.status

    def register_language(self, meta: LanguageMetadata) -> None:
        self._languages[meta.code] = meta


# Global language registry singleton
language_registry = LanguageRegistry()


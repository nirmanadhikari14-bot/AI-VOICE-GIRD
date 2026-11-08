"""
VoiceGuard AI — Multilingual & Indian Accent Support Module
Phase 26: SIH26104
"""

from .config import MultilingualConfig, multilingual_config
from .registry import LanguageRegistry, LanguageMetadata, SupportStatus, language_registry
from .accent_metadata import AccentRegistry, AccentMetadata, AccentGroup, accent_registry
from .language_identifier import LanguageIdentifier, LanguageIdentificationResult
from .code_switching import CodeSwitchingDetector, CodeSwitchSpan, CodeSwitchResult
from .model_manager import ModelManager, model_manager
from .evaluation import MultilingualEvaluator
from .fairness import FairnessAuditor

__all__ = [
    "MultilingualConfig",
    "multilingual_config",
    "LanguageRegistry",
    "LanguageMetadata",
    "SupportStatus",
    "language_registry",
    "AccentRegistry",
    "AccentMetadata",
    "AccentGroup",
    "accent_registry",
    "LanguageIdentifier",
    "LanguageIdentificationResult",
    "CodeSwitchingDetector",
    "CodeSwitchSpan",
    "CodeSwitchResult",
    "ModelManager",
    "model_manager",
    "MultilingualEvaluator",
    "FairnessAuditor",
]

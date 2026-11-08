"""
VoiceGuard AI — Regional Accent & Dialect Metadata Registry
Phase 26: SIH26104
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class AccentGroup(str, Enum):
    INDIAN_ENGLISH = "indian_english"
    REGIONAL_INDIC = "regional_indic"
    GENERAL = "general"


class AccentMetadata(BaseModel):
    """Metadata representation of regional speech, pronunciation, and prosodic variations."""
    accent_id: str = Field(..., description="Unique accent identifier, e.g. 'en_in_gujarati'")
    label: str = Field(..., description="Human-readable descriptive label")
    group: AccentGroup = Field(default=AccentGroup.INDIAN_ENGLISH)
    base_language: str = Field(..., description="Primary language code, e.g. 'en'")
    influence_language: Optional[str] = Field(None, description="Substrate/L1 language code, e.g. 'gu'")
    phonetic_markers: List[str] = Field(default_factory=list, description="Non-punitive phonetic traits")
    prosody_profile: Dict[str, str] = Field(default_factory=dict, description="Speech rate, pitch modulation characteristics")
    safety_notice: str = Field(
        default="MANDATORY ETHICAL POLICY: Accent characteristics are descriptive linguistic traits. "
                "Accent MUST NEVER be treated as suspicious or used to increase fraud risk scores."
    )


class AccentRegistry:
    """Configurable registry for accent metadata, acoustic priors, and fairness constraints."""

    def __init__(self):
        self._accents: Dict[str, AccentMetadata] = {}
        self._init_defaults()

    def _init_defaults(self):
        defaults = [
            AccentMetadata(
                accent_id="en_in_general",
                label="Standard Indian English",
                group=AccentGroup.INDIAN_ENGLISH,
                base_language="en",
                influence_language=None,
                phonetic_markers=[
                    "Retroflex plosives [ʈ, ɖ] substituting alveolar [t, d]",
                    "Unaspirated voiceless stops",
                    "Monophthongal vowels for /eɪ/ and /oʊ/"
                ],
                prosody_profile={"tempo": "syllable-timed", "pitch_range": "moderate"}
            ),
            AccentMetadata(
                accent_id="en_in_gujarati",
                label="Gujarati-influenced English",
                group=AccentGroup.INDIAN_ENGLISH,
                base_language="en",
                influence_language="gu",
                phonetic_markers=[
                    "Voiced murmured stops in loan vocabulary",
                    "Dental vs retroflex contrasts",
                    "Characteristic rising boundary tones in declarative statements"
                ],
                prosody_profile={"tempo": "syllable-timed", "pitch_range": "dynamic", "cadence": "rising"}
            ),
            AccentMetadata(
                accent_id="en_in_bengali",
                label="Bengali-influenced English",
                group=AccentGroup.INDIAN_ENGLISH,
                base_language="en",
                influence_language="bn",
                phonetic_markers=[
                    "Rounded low-back vowels [ɔ]",
                    "Lack of /v/ vs /w/ distinction, realized as [bʱ] or [w]",
                    "Absence of alveolar sibilant contrast in fast speech"
                ],
                prosody_profile={"tempo": "moraic-paced", "pitch_range": "expressive"}
            ),
            AccentMetadata(
                accent_id="en_in_hindi",
                label="Hindi-influenced English",
                group=AccentGroup.INDIAN_ENGLISH,
                base_language="en",
                influence_language="hi",
                phonetic_markers=[
                    "Retroflex consonants [ʈ, ɖ]",
                    "Epenthetic vowel before consonant clusters (e.g., /ɪsk-/ for /sk-/)",
                    "Aspirated stop realizations"
                ],
                prosody_profile={"tempo": "syllable-timed", "pitch_range": "moderate"}
            ),
            AccentMetadata(
                accent_id="en_in_marathi",
                label="Marathi-influenced English",
                group=AccentGroup.INDIAN_ENGLISH,
                base_language="en",
                influence_language="mr",
                phonetic_markers=[
                    "Retroflex lateral flap [ɭ] influence",
                    "Alveolo-palatal affricate variations",
                    "Stressed first syllable tendency in polysyllabic words"
                ],
                prosody_profile={"tempo": "syllable-timed", "pitch_range": "firm"}
            ),
            AccentMetadata(
                accent_id="en_in_tamil",
                label="Tamil-influenced English",
                group=AccentGroup.INDIAN_ENGLISH,
                base_language="en",
                influence_language="ta",
                phonetic_markers=[
                    "Intervocalic voicing of stops",
                    "Retroflex approximant [ɻ] resonance",
                    "Vowel-initial glottal reinforcement"
                ],
                prosody_profile={"tempo": "rapid syllable-timed", "pitch_range": "melodic"}
            ),
            AccentMetadata(
                accent_id="en_in_telugu",
                label="Telugu-influenced English",
                group=AccentGroup.INDIAN_ENGLISH,
                base_language="en",
                influence_language="te",
                phonetic_markers=[
                    "Vocalic word-final releases [u]",
                    "Dental and retroflex articulation clarity",
                    "Vowel harmony in unstressed syllables"
                ],
                prosody_profile={"tempo": "syllable-timed", "pitch_range": "sonorous"}
            ),
            AccentMetadata(
                accent_id="en_in_kannada",
                label="Kannada-influenced English",
                group=AccentGroup.INDIAN_ENGLISH,
                base_language="en",
                influence_language="kn",
                phonetic_markers=[
                    "Voiced retroflex plosives",
                    "Short /e/ and /o/ distinctions retained from Dravidian phonology",
                    "Terminal vowel epenthesis"
                ],
                prosody_profile={"tempo": "syllable-timed", "pitch_range": "balanced"}
            ),
            AccentMetadata(
                accent_id="en_in_malayalam",
                label="Malayalam-influenced English",
                group=AccentGroup.INDIAN_ENGLISH,
                base_language="en",
                influence_language="ml",
                phonetic_markers=[
                    "Extensive gemination of consonants",
                    "Subapical retroflex consonants",
                    "Distinct palatal vs dental nasal contrasts"
                ],
                prosody_profile={"tempo": "fast syllable-timed", "pitch_range": "distinct"}
            ),
            AccentMetadata(
                accent_id="en_in_punjabi",
                label="Punjabi-influenced English",
                group=AccentGroup.INDIAN_ENGLISH,
                base_language="en",
                influence_language="pa",
                phonetic_markers=[
                    "High pitch register on stressed syllables (tonal substrate)",
                    "Voiceless aspirated stops with distinct pitch contours",
                    "Vigorous retroflex realization"
                ],
                prosody_profile={"tempo": "dynamic", "pitch_range": "contour-rich", "cadence": "tonal-inflected"}
            )
        ]
        for item in defaults:
            self._accents[item.accent_id] = item

    def get(self, accent_id: str) -> Optional[AccentMetadata]:
        return self._accents.get(accent_id)

    def list_all(self) -> List[AccentMetadata]:
        return list(self._accents.values())

    def get_by_language(self, base_language: str) -> List[AccentMetadata]:
        return [acc for acc in self._accents.values() if acc.base_language == base_language]

    def register_accent(self, meta: AccentMetadata) -> None:
        self._accents[meta.accent_id] = meta


# Global singleton
accent_registry = AccentRegistry()


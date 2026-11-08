"""
VoiceGuard AI — Code-Switching & Multilingual Span Analysis
Phase 26: SIH26104
"""

import re
from typing import List, Optional, Tuple, Dict
from pydantic import BaseModel, Field


class CodeSwitchSpan(BaseModel):
    """Spoken or textual span marked with a specific language code."""
    language_code: str
    text_segment: str
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    confidence: float = 0.85


class CodeSwitchResult(BaseModel):
    """Result of code-switching / multilingual speech composition analysis."""
    is_code_switched: bool
    primary_language: str
    secondary_language: Optional[str] = None
    language_pair: Optional[str] = None  # e.g. "hi-en", "gu-en", "bn-en"
    colloquial_label: Optional[str] = None  # e.g. "Hinglish", "Gujlish", "Banglish"
    spans: List[CodeSwitchSpan] = Field(default_factory=list)
    mix_ratio: float = Field(default=0.0, description="Estimated proportion of secondary language (0.0 to 1.0)")
    confidence: float = Field(default=0.80)
    warnings: List[str] = Field(default_factory=list)


# Lexical markers for code-switching identification in romanized / native transcripts
INDIC_LEXICAL_MARKERS: Dict[str, List[str]] = {
    "hi": [
        "apna", "karna", "karo", "hai", "nahi", "lijiye", "kijiye", "bhai", "samjho",
        "mujhe", "tumhe", "kya", "kyun", "kaise", "bol", "raha", "rahe", "paise", "khata"
    ],
    "gu": [
        "tamaru", "tame", "che", "nathi", "karo", "aapo", "karjo", "bhai", "sho", "kem",
        "khata", "paisa", "rakho", "bolvu", "kaho", "maharaja"
    ],
    "bn": [
        "tumi", "apni", "aami", "korbo", "hobe", "na", "ache", "kothai", "keno", "bhalo",
        "taka", "shunchen", "bolchi", "khobor"
    ],
    "ta": [
        "ungala", "enga", "pannunga", "illa", "irukku", "sollunga", "theriyum", "romba",
        "ippo", "kaasu", "panam"
    ],
    "te": [
        "meeru", "nenu", "cheyandi", "ledu", "undi", "cheppandi", "telusu", "chala",
        "ippudu", "dabbulu"
    ]
}

ENGLISH_COMMON_WORDS = {
    "please", "account", "verify", "verification", "bank", "transaction", "otp", "code",
    "call", "manager", "support", "card", "safe", "genuine", "transfer", "urgent", "security"
}


class CodeSwitchingDetector:
    """
    Detects code-switched multi-lingual speech patterns (e.g. Hindi-English, Gujarati-English)
    across audio acoustic features and textual transcripts.
    """

    COLLOQUIAL_LABELS = {
        "hi-en": "Hinglish",
        "en-hi": "Hinglish",
        "gu-en": "Gujlish",
        "en-gu": "Gujlish",
        "bn-en": "Banglish",
        "en-bn": "Banglish",
        "ta-en": "Tanglish",
        "en-ta": "Tanglish",
        "te-en": "Tenglish",
        "en-te": "Tenglish",
    }

    @classmethod
    def analyze_transcript(cls, text: str) -> CodeSwitchResult:
        """
        Analyze a transcribed utterance to detect lexical code-switching,
        extract language spans, and compute the language mix ratio.
        """
        if not text or not text.strip():
            return CodeSwitchResult(
                is_code_switched=False,
                primary_language="unknown",
                confidence=0.0
            )

        tokens = re.findall(r"[\w']+|[.,!?;]", text)
        words = [t.lower() for t in tokens if t.isalnum()]

        if len(words) < 2:
            return CodeSwitchResult(
                is_code_switched=False,
                primary_language="en",
                mix_ratio=0.0,
                confidence=0.5
            )

        # Count occurrences of Indic vs English lexical markers
        indic_counts: Dict[str, int] = {lang: 0 for lang in INDIC_LEXICAL_MARKERS}
        english_count = 0

        for w in words:
            if w in ENGLISH_COMMON_WORDS:
                english_count += 1
            for lang, markers in INDIC_LEXICAL_MARKERS.items():
                if w in markers:
                    indic_counts[lang] += 1

        top_indic_lang = max(indic_counts.items(), key=lambda x: x[1])
        top_indic_code, top_indic_count = top_indic_lang

        total_marked = top_indic_count + english_count

        if top_indic_count > 0 and english_count > 0:
            pair = f"{top_indic_code}-en"
            colloquial = cls.COLLOQUIAL_LABELS.get(pair, "Mixed Indic-English")
            mix_ratio = min(top_indic_count, english_count) / float(max(total_marked, 1))

            # Build granular text spans
            spans = []
            current_span_words = []
            current_span_lang = None

            for t in tokens:
                if not t.isalnum():
                    if current_span_words:
                        current_span_words.append(t)
                    continue

                token_lower = t.lower()
                tok_lang = (
                    "en" if token_lower in ENGLISH_COMMON_WORDS
                    else (top_indic_code if token_lower in INDIC_LEXICAL_MARKERS[top_indic_code] else "unknown")
                )

                if tok_lang == current_span_lang or tok_lang == "unknown":
                    current_span_words.append(t)
                else:
                    if current_span_words:
                        spans.append(CodeSwitchSpan(
                            language_code=current_span_lang or top_indic_code,
                            text_segment=" ".join(current_span_words),
                            confidence=0.88
                        ))
                    current_span_words = [t]
                    current_span_lang = tok_lang

            if current_span_words:
                spans.append(CodeSwitchSpan(
                    language_code=current_span_lang or top_indic_code,
                    text_segment=" ".join(current_span_words),
                    confidence=0.88
                ))

            return CodeSwitchResult(
                is_code_switched=True,
                primary_language=top_indic_code if top_indic_count >= english_count else "en",
                secondary_language="en" if top_indic_count >= english_count else top_indic_code,
                language_pair=pair,
                colloquial_label=colloquial,
                spans=spans,
                mix_ratio=round(mix_ratio, 2),
                confidence=round(min(0.95, 0.65 + (total_marked * 0.05)), 2),
                warnings=[]
            )

        # Monolingual
        if top_indic_count > 0:
            return CodeSwitchResult(
                is_code_switched=False,
                primary_language=top_indic_code,
                mix_ratio=0.0,
                confidence=0.85
            )

        return CodeSwitchResult(
            is_code_switched=False,
            primary_language="en",
            mix_ratio=0.0,
            confidence=0.85
        )

    @classmethod
    def evaluate_acoustic_code_switching(
        cls,
        top_candidates: List[Tuple[str, float]]
    ) -> Tuple[bool, Optional[str], float]:
        """
        Evaluate if acoustic LID probabilities indicate multi-lingual speech.
        Returns: (is_mixed, detected_pair, confidence)
        """
        if len(top_candidates) < 2:
            return False, None, 0.0

        lang1, score1 = top_candidates[0]
        lang2, score2 = top_candidates[1]

        # If top 2 are an Indic language + English and difference is small (<0.22)
        indic_set = {"hi", "gu", "bn", "ta", "te", "mr", "kn", "ml", "pa", "or", "as", "ur"}
        pair_set = {lang1, lang2}

        if "en" in pair_set and bool(pair_set.intersection(indic_set)):
            diff = abs(score1 - score2)
            if diff < 0.22:
                indic_partner = list(pair_set.intersection(indic_set))[0]
                pair_name = f"{indic_partner}-en"
                conf = 1.0 - (diff / 0.22) * 0.35  # Higher confidence when scores are close
                return True, pair_name, round(conf, 2)

        return False, None, 0.0


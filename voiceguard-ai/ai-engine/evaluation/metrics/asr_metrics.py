"""
VoiceGuard AI — ASR Error Rate & Text Normalization Metrics
Phase 27: SIH26104
"""

import re
from typing import List, Tuple
from pydantic import BaseModel


class ASRMetrics(BaseModel):
    word_error_rate: float
    character_error_rate: float
    reference_word_count: int
    hypothesis_word_count: int
    substitutions: int
    deletions: int
    insertions: int


class ASRMetricEngine:
    """
    Standardized Word Error Rate (WER) and Character Error Rate (CER)
    evaluation based on dynamic programming Levenshtein distance.
    """

    @classmethod
    def normalize_text(cls, text: str) -> str:
        """
        Normalize reference and hypothesis texts prior to error rate calculation:
        lowercase, strip punctuation, normalize multiple whitespace.
        """
        if not text:
            return ""
        # Lowercase
        t = text.lower()
        # Remove common punctuation
        t = re.sub(r"[^\w\s]", "", t)
        # Collapse whitespace
        t = re.sub(r"\s+", " ", t).strip()
        return t

    @classmethod
    def compute_levenshtein(cls, ref_tokens: List[str], hyp_tokens: List[str]) -> Tuple[int, int, int]:
        """
        Computes (substitutions, deletions, insertions) between ref and hyp sequences
        using the Wagner-Fischer dynamic programming algorithm.
        """
        r_len = len(ref_tokens)
        h_len = len(hyp_tokens)

        # Distance matrix
        d = [[0] * (h_len + 1) for _ in range(r_len + 1)]

        for i in range(r_len + 1):
            d[i][0] = i
        for j in range(h_len + 1):
            d[0][j] = j

        for i in range(1, r_len + 1):
            for j in range(1, h_len + 1):
                if ref_tokens[i - 1] == hyp_tokens[j - 1]:
                    d[i][j] = d[i - 1][j - 1]
                else:
                    sub = d[i - 1][j - 1] + 1
                    dele = d[i - 1][j] + 1
                    ins = d[i][j - 1] + 1
                    d[i][j] = min(sub, dele, ins)

        # Backtrack to decompose into S, D, I
        i = r_len
        j = h_len
        subs = 0
        dels = 0
        inss = 0

        while i > 0 or j > 0:
            if i > 0 and j > 0 and ref_tokens[i - 1] == hyp_tokens[j - 1]:
                i -= 1
                j -= 1
            elif i > 0 and j > 0 and d[i][j] == d[i - 1][j - 1] + 1:
                subs += 1
                i -= 1
                j -= 1
            elif i > 0 and d[i][j] == d[i - 1][j] + 1:
                dels += 1
                i -= 1
            elif j > 0 and d[i][j] == d[i][j - 1] + 1:
                inss += 1
                j -= 1
            else:
                if i > 0:
                    i -= 1
                if j > 0:
                    j -= 1

        return subs, dels, inss

    @classmethod
    def compute_wer(cls, reference: str, hypothesis: str) -> float:
        """Computes Word Error Rate: (S + D + I) / N_ref"""
        ref_norm = cls.normalize_text(reference)
        hyp_norm = cls.normalize_text(hypothesis)

        ref_words = ref_norm.split()
        hyp_words = hyp_norm.split()

        if len(ref_words) == 0:
            return 0.0 if len(hyp_words) == 0 else 1.0

        subs, dels, inss = cls.compute_levenshtein(ref_words, hyp_words)
        wer = (subs + dels + inss) / float(len(ref_words))
        return float(wer)

    @classmethod
    def compute_cer(cls, reference: str, hypothesis: str) -> float:
        """Computes Character Error Rate: (S_char + D_char + I_char) / N_char_ref"""
        ref_norm = cls.normalize_text(reference).replace(" ", "")
        hyp_norm = cls.normalize_text(hypothesis).replace(" ", "")

        ref_chars = list(ref_norm)
        hyp_chars = list(hyp_norm)

        if len(ref_chars) == 0:
            return 0.0 if len(hyp_chars) == 0 else 1.0

        subs, dels, inss = cls.compute_levenshtein(ref_chars, hyp_chars)
        cer = (subs + dels + inss) / float(len(ref_chars))
        return float(cer)

    @classmethod
    def evaluate(cls, reference: str, hypothesis: str) -> ASRMetrics:
        ref_norm = cls.normalize_text(reference)
        hyp_norm = cls.normalize_text(hypothesis)

        ref_words = ref_norm.split()
        hyp_words = hyp_norm.split()

        if len(ref_words) == 0:
            return ASRMetrics(
                word_error_rate=0.0 if len(hyp_words) == 0 else 1.0,
                character_error_rate=0.0 if len(hyp_norm) == 0 else 1.0,
                reference_word_count=0,
                hypothesis_word_count=len(hyp_words),
                substitutions=0,
                deletions=0,
                insertions=len(hyp_words)
            )

        subs, dels, inss = cls.compute_levenshtein(ref_words, hyp_words)
        wer = (subs + dels + inss) / float(len(ref_words))
        cer = cls.compute_cer(reference, hypothesis)

        return ASRMetrics(
            word_error_rate=round(wer, 4),
            character_error_rate=round(cer, 4),
            reference_word_count=len(ref_words),
            hypothesis_word_count=len(hyp_words),
            substitutions=subs,
            deletions=dels,
            insertions=inss
        )


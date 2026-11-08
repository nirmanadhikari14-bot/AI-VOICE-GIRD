# VoiceGuard AI — Language Support Matrix
## Phase 26: SIH26104

---

## 1. Target Coverage Summary

VoiceGuard AI defines an explicit, configurable **Language Registry** covering 13 foundational Indian languages plus Indian English.

| Code | Language Name | Native Autonym | Script | Status | Min Conf | Code-Switching Pairs |
|:---:|:---|:---|:---|:---:|:---:|:---|
| `en` | English (Indian) | English | Latin | **Supported** | 65% | hi, gu, bn, ta, te |
| `hi` | Hindi | हिन्दी | Devanagari | **Supported** | 65% | en, ur, pa |
| `bn` | Bengali | বাংলা | Bengali | **Supported** | 65% | en, hi, as |
| `gu` | Gujarati | ગુજરાતી | Gujarati | **Supported** | 65% | en, hi |
| `mr` | Marathi | मराठी | Devanagari | **Supported** | 65% | en, hi |
| `ta` | Tamil | தமிழ் | Tamil | **Supported** | 65% | en |
| `te` | Telugu | తెలుగు | Telugu | **Supported** | 65% | en, hi |
| `kn` | Kannada | ಕನ್ನಡ | Kannada | **Supported** | 65% | en |
| `ml` | Malayalam | മലയാളം | Malayalam | **Supported** | 65% | en |
| `pa` | Punjabi | ਪੰਜਾਬੀ | Gurmukhi | **Supported** | 65% | en, hi |
| `or` | Odia | ଓଡ଼ିଆ | Odia | **Partially Supported** | 60% | en, hi |
| `as` | Assamese | অসমীয়া | Bengali-Assamese | **Partially Supported** | 60% | en, bn |
| `ur` | Urdu | اردو | Perso-Arabic (Nastaliq) | **Supported** | 65% | en, hi |

---

## 2. Support Status Definitions

1. **`supported`**: Fully validated with empirical benchmark test splits (e.g. Shruti / AI4Bharat test corpora). Models produce calibrated confidence scores and high-accuracy ASR transcriptions.
2. **`partially_supported`**: Baseline ASR and LID models configured and functional; comprehensive regional dialect variations and rural acoustic testing are actively expanding.
3. **`unsupported`**: Languages outside the validated operational registry. The system explicitly returns an unsupported status with a warning rather than forcing a low-confidence false classification.
4. **`unknown`**: Audio frames lacking sufficient speech energy, SNR, or phonetic structure for conclusive identification.
5. **`mixed`**: Multi-lingual or code-switched conversational segments (e.g., Hinglish, Gujlish, Banglish).
6. **`low_confidence`**: Classification confidence is beneath the language's defined threshold (e.g., < 0.65).

---

## 3. Script & Transliteration Handling

- **Devanagari (Hindi, Marathi):** Handled natively in Devanagari Unicode. Romanized Hinglish transliteration is decomposed through `CodeSwitchingDetector`.
- **Gujarati & Bengali:** Processed natively. Financial loan words in Latin script are supported via mixed-script vocabulary dictionaries.
- **Dravidian Scripts (Tamil, Telugu, Kannada, Malayalam):** Native scripts supported. Romanized loan phrases in urban registers (Tanglish, Kanglish) are mapped to mixed language spans.
- **Nastaliq / Gurmukhi (Urdu, Punjabi):** Fully supported in their respective Unicode ranges.


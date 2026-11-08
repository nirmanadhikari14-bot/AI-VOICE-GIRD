# VoiceGuard AI — Regional Accent & Dialect Guide
## Phase 26: SIH26104

---

## 1. Regional Indian English Variations

VoiceGuard AI models regional English accents influenced by first-language (L1) phonology:

### 1. `en_in_general` — Standard Indian English
- **Phonetic Markers:** Retroflex plosives [ʈ, ɖ] substituting alveolar [t, d]; unaspirated voiceless stops; monophthongal realization of /eɪ/ and /oʊ/.
- **Prosody:** Syllable-timed cadence with balanced pitch register.

### 2. `en_in_gujarati` — Gujarati-influenced English
- **Phonetic Markers:** Voiced murmured stops in loan vocabulary; dental vs retroflex contrasts; rising boundary tones in declarative statements.
- **Prosody:** Syllable-timed cadence with dynamic pitch modulation.

### 3. `en_in_bengali` — Bengali-influenced English
- **Phonetic Markers:** Rounded low-back vowels [ɔ]; absence of strict /v/ vs /w/ distinction (realized as [bʱ] or [w]); neutralized alveolar sibilants.
- **Prosody:** Moraic-paced, expressive pitch contours.

### 4. `en_in_hindi` — Hindi-influenced English
- **Phonetic Markers:** Retroflex consonants [ʈ, ɖ]; epenthetic initial vowel before s-clusters (/ɪsk-/ for /sk-/); aspirated stop realizations.
- **Prosody:** Syllable-timed cadence with moderate pitch range.

### 5. `en_in_marathi` — Marathi-influenced English
- **Phonetic Markers:** Retroflex lateral flap [ɭ] influence; alveolo-palatal affricate variations; initial-syllable stress in polysyllabic words.
- **Prosody:** Syllable-timed, firm rhythmic delivery.

### 6. `en_in_tamil` — Tamil-influenced English
- **Phonetic Markers:** Intervocalic stop voicing; retroflex approximant [ɻ] resonance; vowel-initial glottal reinforcement.
- **Prosody:** Rapid syllable-timed, melodic contour.

### 7. `en_in_telugu` — Telugu-influenced English
- **Phonetic Markers:** Terminal vocalic releases [u]; clear dental/retroflex contrasts; vowel harmony in unstressed syllables.
- **Prosody:** Sonorous, syllable-timed cadence.

### 8. `en_in_kannada` — Kannada-influenced English
- **Phonetic Markers:** Voiced retroflex plosives; short /e/ and /o/ distinctions; terminal vowel epenthesis.
- **Prosody:** Syllable-timed, balanced cadence.

### 9. `en_in_malayalam` — Malayalam-influenced English
- **Phonetic Markers:** Geminate consonants; subapical retroflex realizations; distinct palatal vs dental nasals.
- **Prosody:** Fast syllable-timed delivery.

### 10. `en_in_punjabi` — Punjabi-influenced English
- **Phonetic Markers:** High pitch registers on stressed syllables (tonal substrate); voiceless aspirated stops with distinct pitch contours; retroflex emphasis.
- **Prosody:** Dynamic, contour-rich, tonal-inflected cadence.

---

## 2. Mandatory Anti-Bias & Ethical Rules

> [!IMPORTANT]
> The following rules are programmatically enforced across all VoiceGuard AI models and risk engines:

1. **RULE 1: ZERO RISK PENALTY FOR ACCENT**
   Regional pronunciation and dialect patterns are neutral descriptive traits. Accent detection **MUST NEVER** increase a fraud risk score.
2. **RULE 2: LANGUAGE MISMATCH IS NOT IMPERSONATION**
   A speaker enrolling in Hindi and verifying in English (or vice versa) is a common Indian multilingual behavior. Language mismatch **MUST NOT** be treated as proof of identity impersonation.
3. **RULE 3: NO DEMOGRAPHIC INFERENCE FROM DIALECT**
   The platform strictly prohibits inferring a caller's ethnicity, religion, caste, socio-economic background, or precise geographical location from their speech characteristics.
4. **RULE 4: LOW ASR CONFIDENCE IS NOT A FRAUD INDICATOR**
   Acoustic noise, telephony compression, or vocabulary variations that lower ASR transcription confidence must never be converted into synthetic voice probability.
5. **RULE 5: EXPLICIT UNVALIDATED LANGUAGE WARNINGS**
   When an utterance belongs to a language outside the validated domain, the system surfaces an explicit warning rather than reporting an uncertain inference as a fact.


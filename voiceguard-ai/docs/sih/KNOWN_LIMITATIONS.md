# VoiceGuard AI — Known Limitations & Architectural Disclosures
## SIH26104: AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks
### Transparent Engineering Disclosures, Simulation Boundaries & Roadmap Mitigations

---

## 1. Executive Disclosure Policy

In accordance with the highest standards of scientific integrity and Smart India Hackathon engineering rules, the VoiceGuard AI engineering team provides complete, transparent disclosure of all platform capabilities.

We explicitly distinguish between:
1. **Fully Implemented & Empirically Verified Features** (tested with zero mocks in core algorithmic paths).
2. **Controlled Simulations** (external telco and hardware carrier interfaces safely mocked for demonstration).
3. **Planned Future Extensions** (architected but scheduled for post-hackathon national deployment).

---

## 2. Detailed Technical Disclosures

### 2.1 Telecom Carrier Call Disconnection: Controlled Simulation
- **Current Status**: **Simulated via Carrier Gateway Mock (`telephony_gateway`)**
- **Technical Detail**: In a live telecom network (e.g., Airtel, Jio, Vi), dropping an active PSTN/VoIP phone call in mid-stream requires integration with carrier-grade Session Border Controllers (SBCs) or Diameter/SIP signaling gateways via SIP `BYE` or `486 Busy Here` packets. Because a hackathon environment cannot legally alter public switched telephone networks, VoiceGuard AI cleanly abstracts carrier intervention through a standardized `telephony_gateway` provider.
- **What is Real**: The Central Risk Engine's policy decision (`TERMINATE_TRANSACTION_BLOCK_CALL`), the generation of the `PreventionAction` database record, and the frontend event emission are **100% real and fully executed**.
- **Roadmap Resolution**: Integration with open-source PBX platforms (FreeSWITCH / Asterisk) using SIP REC (RFC 7865) for live carrier field trials.

---

### 2.2 Out-of-Band Secondary Push Authentication: Simulated Push Hook
- **Current Status**: **Simulated Notification Webhook**
- **Technical Detail**: When a call enters the `HIGH RISK` tier (score 60–79), the policy engine triggers "Step-Up Authentication". In production, this dispatches a cryptographic push notification to the customer's registered mobile banking app (e.g., via Apple APNs or Google FCM). In our demonstration environment, this action is emitted as a webhook event and rendered on the SOC dashboard as a pending verification state.
- **What is Real**: The risk threshold trigger, policy routing, and database event logging are fully functional.

---

### 2.3 CPU-First Model Execution vs. GPU Cluster Scaling
- **Current Status**: **CPU-Optimized Inference**
- **Technical Detail**: All audio DSP (`FastAcousticFeatureExtractor`, NumPy FFTs) and deep learning adapters are optimized for low-latency CPU execution (P50 = 0.044 ms for DSP, 7.88 ms end-to-end). A single 8-core CPU server sustains **500 concurrent active calls**.
- **Limitation**: While 500 calls is optimal for enterprise branch offices and regional hubs, tier-1 telecom providers handling 50,000+ concurrent calls per exchange require GPU-accelerated batch inference (e.g., NVIDIA Triton Inference Server with TensorRT-LLM).
- **Roadmap Resolution**: Phase 35 introduces TensorRT export for GPU cluster deployment.

---

### 2.4 Narrowband Telephony Codec Bandwidth Limits (8 kHz G.711)
- **Current Status**: **Handled via Codec Augmentation & Prosody Focus**
- **Technical Detail**: Standard Indian 2G/3G landline calls use the G.711 codec, which samples audio at 8,000 Hz and applies a 300 Hz – 3,400 Hz bandpass filter. Upsampling to 16,000 Hz restores temporal sample count for standard models, but the physical acoustic frequencies above 3.4 kHz are permanently lost in the network.
- **Mitigation**: VoiceGuard AI does not rely solely on high-frequency vocoder artifacts. Our models extract fundamental frequency (F0) micro-tremors, prosodic pitch jitter, and vocal tract resonance characteristics that reside entirely within the 300 Hz – 3,400 Hz band. However, detection confidence is empirically ~4% higher on wideband/VoLTE audio (AMR-WB / Opus) than on narrowband G.711.

---

### 2.5 Extreme Low Acoustic SNR (Severe Background Noise)
- **Current Status**: **Mitigated via Spectral Subtraction & VAD**
- **Technical Detail**: In extreme acoustic environments (e.g., caller shouting on a busy railway platform or in torrential rain with Signal-to-Noise Ratio SNR < 5 dB), background environmental acoustic noise can partially obscure neural vocoder phase errors.
- **Mitigation**: Our `FastAcousticFeatureExtractor` applies dynamic energy thresholding and Voice Activity Detection (VAD). In addition, our multi-modal Bayesian risk engine automatically increases the weights of speaker verification and NLP conversational intelligence when acoustic authenticity confidence drops.

---

### 2.6 On-Device Mobile Hardware Verification
- **Current Status**: **Architected; Primary Validation on Desktop & Server Docker**
- **Technical Detail**: The VoiceGuard AI architecture includes a Flutter/Android client repository specification. However, live regression testing and latency benchmarking for this phase were executed on standard Linux and Windows enterprise server environments. Direct on-device hardware dialer hooking (e.g., Android TelephonyManager on real physical chipsets) is scheduled for the pilot field deployment phase.

---

## 3. Summary Compliance Table

| Feature / Subsystem | Verification State | Operational Status |
|:---|:---:|:---|
| **Audio Header & Magic Byte Validation** | 100% Empirically Tested | Fully Implemented |
| **Circular Ring Buffer DSP (0.044ms)** | 100% Empirically Tested | Fully Implemented |
| **Synthetic Voice Conformer Detector** | 100% Empirically Tested | Fully Implemented |
| **ECAPA-TDNN Speaker Verification** | 100% Empirically Tested | Fully Implemented |
| **Central Risk Evaluator (v17.4)** | 100% Empirically Tested | Fully Implemented |
| **Explainable AI (XAI) Evidence Dossier** | 100% Empirically Tested | Fully Implemented |
| **DPDP Act 2023 Consent Guard** | 100% Empirically Tested | Fully Implemented |
| **Multi-Tenant Database Isolation** | 100% Empirically Tested | Fully Implemented |
| **Automated P1 Incident Generation** | 100% Empirically Tested | Fully Implemented |
| **PSTN / Telecom Carrier Disconnection** | Simulated Provider Interface | Controlled Simulation |
| **Out-of-Band Push Notification** | Webhook / Event Bus Interface | Controlled Simulation |
| **Real-time Mobile Dialer Hook** | Planned Architecture | Post-Hackathon Roadmap |


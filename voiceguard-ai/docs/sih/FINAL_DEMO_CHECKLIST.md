# VoiceGuard AI — Final Demonstration Checklist
## SIH26104: AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks
### Operational Pre-Demo, Demo-Day, and Live Execution Verification Checklist

---

## 1. Timeline Overview

```
[T-24 Hours: Code Freeze & Build Verification]
      ↓
[T-2 Hours: Hardware, Display & Environment Setup]
      ↓
[T-30 Minutes: Services Startup & Smoke Test]
      ↓
[T-5 Minutes: Final Screen & Tab Alignment]
      ↓
[0:00 - 10:00: Live Jury Demonstration & Q&A]
      ↓
[Post-Demo: Evidence Export & System Teardown]
```

---

## 2. Detailed Checklist Stages

### Phase 1: T-24 Hours — Build Freeze & Quality Gate
- [x] **Repository Status**: Git working tree clean, all experimental branches merged or stashed.
- [x] **Backend Test Suite**: Full pytest regression run executed (`262 passed in 20.7s`).
- [x] **Security Fixes**: Verified all 5 Phase 33 CVEs remediated (`test_security_validation_phase33.py` passing).
- [x] **Frontend Production Build**: `npm run build` succeeds in `frontend/` without TypeScript or bundle warnings (`dist/` generated cleanly in 6.1s).
- [x] **Demo Audio Samples**: Verified presence of `datasets/demo/case_a_genuine_voice.wav` and `datasets/demo/case_b_synthetic_clone.wav`.
- [x] **Rehearsal Engine**: `infra/scripts/run_demo_rehearsal.py` completes with zero assertion failures.

---

### Phase 2: T-2 Hours — Hardware & Display Configuration
- [ ] **Laptop Power**: Primary demonstration laptop connected to AC mains power (power plan set to "High Performance" to avoid CPU throttling).
- [ ] **Display Scaling**: Display resolution set to 1920x1080 @ 100% scaling to prevent browser UI layout distortion on projector/HDMI.
- [ ] **Network Stability**: Connected to reliable Wi-Fi or local mobile hotspot (offline mode verified in case of hall network drop).
- [ ] **Notifications Disabled**: OS notifications, Slack, WhatsApp, and email alerts silenced via "Focus Assist" / "Do Not Disturb".
- [ ] **Audio Hardware**: Laptop audio output volume set to 75% for audio playback; external speakers or headphone splitter tested.

---

### Phase 3: T-30 Minutes — Service Startup & Smoke Testing
- [ ] **Terminal 1: Start Backend Server**:
  ```powershell
  cd "c:\Users\NIRMAN\OneDrive\Desktop\VOICE COLONING\voiceguard-ai\backend"
  .\venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```
  - Verify endpoint responds: `curl http://localhost:8000/api/v1/health` -> `{"status":"healthy"}`.
- [ ] **Terminal 2: Start Frontend Server**:
  ```powershell
  cd "c:\Users\NIRMAN\OneDrive\Desktop\VOICE COLONING\voiceguard-ai\frontend"
  npm run dev
  ```
  - Verify browser opens cleanly at `http://localhost:5173`.
- [ ] **Terminal 3: Ready Fallback CLI**:
  - Keep a dedicated terminal window open in `infra/scripts/` ready to run `python run_demo_rehearsal.py` if needed.
- [ ] **Database Pre-Warm**:
  - Run `python infra/scripts/run_demo_rehearsal.py` once to pre-seed the active call and verify table schemas.

---

### Phase 4: T-5 Minutes — Screen & Browser Alignment
- [ ] **Browser Window 1 (Main Screen)**:
  - Tab 1: `http://localhost:5173/dashboard` (SOC Operations Overview)
  - Tab 2: `http://localhost:5173/live-calls` (Live Call Audio Spectrum & Ingestion)
  - Tab 3: `http://localhost:5173/incidents` (Incident Evidence Dossier)
- [ ] **Browser Window 2 (Presenter Reference / Slide Deck)**:
  - 15-Slide Presentation Deck loaded in presentation mode (`docs/sih/PRESENTATION_CONTENT.md`).
- [ ] **Audio Playback Test**: Briefly play a 0.5s segment of `case_a_genuine_voice.wav` to verify sound output to speakers.

---

### Phase 5: Live Demonstration Execution
- [ ] **Minute 0:00–1:00**: Presenter 1 delivers the hook, defines the urgent national threat of voice cloning, and introduces VoiceGuard AI.
- [ ] **Minute 1:00–2:30**: Presenter 2 walks through the SOC Dashboard and architecture diagram.
- [ ] **Minute 2:30–4:30**: Ingest **Case A (Genuine Voice)**. Point out the low risk score (21.6), authentic vocal harmonics, and frictionless call pass-through.
- [ ] **Minute 4:30–7:00**: Ingest **Case B (Synthetic Clone Attack)**. Show live waveform turning **RED**, vocoder phase discontinuity detection (94.2), biometric divergence, Central Risk score (87.0 Critical), and automated call termination / transaction freeze.
- [ ] **Minute 7:00–8:30**: Show the **Explainable AI Evidence Dossier** and DPDP Act 2023 consent validation in the incident console.
- [ ] **Minute 8:30–10:00**: Highlight empirical benchmarks (262 passing tests, 0.044ms DSP latency), wrap up, and invite judge questions.

---

### Phase 6: Post-Demonstration Teardown & Archival
- [ ] Export session audit logs: `GET /api/v1/audit/logs`.
- [ ] Stop backend and frontend development processes cleanly (`Ctrl+C`).
- [ ] Back up latest test database snapshot.


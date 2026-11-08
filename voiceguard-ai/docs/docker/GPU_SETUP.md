# VoiceGuard AI — GPU Acceleration & NVIDIA Container Toolkit Setup
## Phase 30: Dockerization (SIH26104)

### 1. Overview
VoiceGuard AI AI inference models (Conformer acoustic vocoder detector, ECAPA-TDNN speaker verification, Whisper transcription, Wav2Vec2 feature extraction) achieve sub-50ms inference latencies when accelerated with NVIDIA GPUs via CUDA.

---

### 2. Host Prerequisites
- Linux OS (Ubuntu 22.04 LTS / Debian 12 / RHEL 9 recommended) or Windows 11 with WSL2
- NVIDIA GPU with Compute Capability 7.0+ (T4, A10, A100, RTX 3080+, L40S)
- NVIDIA Driver 535+ installed
- Docker Engine 24+
- NVIDIA Container Toolkit (`nvidia-container-toolkit`)

---

### 3. Installing NVIDIA Container Toolkit (Ubuntu/Debian)

```bash
# 1. Configure the production repository
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# 2. Install toolkit packages
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# 3. Configure Docker daemon for NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# 4. Verify GPU passthrough into Docker
docker run --rm --gpus all nvidia/cuda:12.1.1-base-ubuntu22.04 nvidia-smi
```

---

### 4. Running VoiceGuard AI with GPU Acceleration

To run VoiceGuard AI with GPU hardware passthrough, use the `docker-compose.gpu.yml` override:

```bash
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

#### What `docker-compose.gpu.yml` Configures:
- Direct NVIDIA GPU device reservations via Docker Compose V2 `deploy.resources.reservations.devices`.
- Environment variables:
  - `VOICEGUARD_DEVICE=cuda`
  - `TORCH_DEVICE=cuda`
  - `CUDA_VISIBLE_DEVICES=0`
  - `NVIDIA_VISIBLE_DEVICES=all`
  - `NVIDIA_DRIVER_CAPABILITIES=compute,utility`
  - `MODEL_CONCURRENCY=4` (Increases concurrent inference thread pool)
  - `BATCH_INFERENCE_SIZE=16` (Enables GPU tensor batching)
- Spawns dedicated `ai-worker` service for background model batch inference and offline evaluation benchmarks.

---

### 5. Verifying GPU Utilization
To check whether models are actively utilizing the GPU:

```bash
# Monitor GPU memory and compute inside host
watch -n 1 nvidia-smi

# Check inference device reported in backend logs
docker-compose logs backend | grep -i "cuda"
```


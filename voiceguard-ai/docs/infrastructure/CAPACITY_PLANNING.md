# VoiceGuard AI — Capacity Planning & Resource Sizing
## Phase 32: Production Infrastructure (SIH26104)

---

## 1. Executive Summary & Benchmark Evidence

VoiceGuard AI's infrastructure sizing is grounded in empirical micro-benchmark measurements collected during Phase 28:

| Operation | P50 Latency | P95 Latency | Throughput / Unit |
|-----------|-------------|-------------|-------------------|
| InMemoryCache GET | 0.0007 ms | 0.0010 ms | > 1,000,000 ops/sec |
| AudioRingBuffer Write (20ms) | 0.0009 ms | 0.0015 ms | > 500,000 frames/sec |
| AcousticFeatureExtractor (CPU) | 0.0879 ms | 0.1484 ms | ~ 11,300 frames/sec |
| ThreadPoolExecutor Dispatch | 0.0600 ms | 0.1400 ms | ~ 16,000 dispatches/sec |
| StreamSession Ingest Chunk | 0.1344 ms | 0.2588 ms | ~ 7,400 chunks/sec |
| Baseline API `GET /api/v1/risk/latest` | 7.88 ms | 18.91 ms | ~ 125 req/sec (single core) |

### Key Architectural Takeaway:
At **0.088 ms per audio frame** feature extraction on standard CPU, 1 CPU core can comfortably process real-time audio streams for dozens of simultaneous callers. A dedicated GPU is **not required** for the current acoustic and rule-based verification pipeline, significantly lowering cost and operational complexity. GPU instances are only justified when running multi-billion-parameter acoustic foundation models (e.g. Whisper large / Wav2Vec2-XLSR) in batch mode.

---

## 2. Workload & Sizing Profiles

```
+-----------------------------------------------------------------------------------------+
|                                    DEPLOYMENT PROFILES                                  |
+----------------------+--------------------------------+---------------------------------+
| Profile              | Target Scale                   | Typical Scenario                |
+----------------------+--------------------------------+---------------------------------+
| Dev / Demo (SIH)     | 1 - 25 concurrent streams      | Hackathon jury, local tests     |
| Staging              | 25 - 100 concurrent streams    | Pre-release QA, automated tests |
| Production           | 100 - 500 concurrent streams   | Live enterprise / call center   |
+----------------------+--------------------------------+---------------------------------+
```

### Profile A: Development / Demonstration (SIH Jury Setup)
- **Workload**: 1 to 25 concurrent calls, 100 API req/min
- **Compute**: 4 vCPU, 8 GB RAM (x86_64)
- **GPU**: None (CPU inference via ONNX / Torch-CPU fallback)
- **Storage**: 40 GB SSD (OS + Docker images + models + ephemeral audio buffers)
- **Database**: PostgreSQL 16 (shared container, 1 GB RAM, max 50 connections)
- **Redis**: 512 MB RAM, LRU eviction
- **Network**: 100 Mbps egress
- **Estimated Monthly Cost**:
  - AWS (`t4g.xlarge` or `c7g.xlarge`): ~$60 - $75/mo
  - GCP (`e2-standard-4`): ~$65/mo
  - Dedicated VPS (Hetzner / DigitalOcean / Linode 8GB): **$24 - $48/mo**

### Profile B: Staging Environment
- **Workload**: Up to 100 concurrent calls, continuous CI/CD integration runs
- **Compute**: 8 vCPU, 16 GB RAM
- **GPU**: Optional (T4 / L4 for model regression tests)
- **Storage**: 100 GB NVMe SSD
- **Database**: PostgreSQL 16 (2 GB RAM, max 100 connections, automated daily backup)
- **Redis**: 1 GB RAM, persistence enabled (RDB snapshots)
- **Network**: 500 Mbps egress
- **Estimated Monthly Cost**:
  - AWS (`c6i.2xlarge`): ~$170/mo
  - GCP (`c2-standard-8`): ~$190/mo
  - Bare Metal / Managed VPS: **$80 - $120/mo**

### Profile C: Production Environment (Single-Node High Density)
- **Workload**: Up to 500 concurrent real-time audio sessions, 5,000 req/min API
- **Compute**: 16 vCPU, 32 GB RAM (or 2x 8 vCPU scaled behind Nginx upstream)
- **GPU**: 1x NVIDIA L4 (24GB VRAM) or A10G (if deep transformer inference enabled)
- **Storage**: 250 GB NVMe (System + DB) + S3-compatible Object Storage for cold audio archives
- **Database**: Managed PostgreSQL (AWS RDS / Cloud SQL) 4 vCPU, 16 GB RAM, Multi-AZ
- **Redis**: Managed Redis Cluster / Sentinel (2 nodes, 2 GB RAM)
- **Network**: 1 Gbps redundant egress, Cloudflare Enterprise / AWS CloudFront WAF
- **Estimated Monthly Cost**:
  - AWS (EC2 + RDS + ElastiCache + S3): **$450 - $650/mo**
  - GCP (Compute Engine + Cloud SQL + Memorystore): **$420 - $620/mo**
  - Self-hosted hybrid (Bare-metal server + S3 backups): **$180 - $280/mo**

---

## 3. Storage Growth Projections

Audio retention is governed by strict privacy controls (Phase 25 consent requirements):
- Real-time audio chunks in RAM (`AudioRingBuffer`): 0 bytes disk growth.
- Extracted features / embeddings (64 floats per frame): ~256 bytes / second.
- Encrypted raw audio (optional consent-based recording, 16kHz 16-bit mono PCM):
  - 1 second = 32 KB
  - 1 minute = 1.92 MB
  - 1 hour = 115.2 MB
  - 100 calls/day @ 3 mins avg = ~576 MB / day (~17.2 GB / month)
- Lifecycle policy: Ephemeral raw audio purged after 72 hours; forensic audit records retained 90 days.

---

## 4. Cost Optimization Recommendations

1. **CPU-First Audio Ingestion**: Keep the real-time pipeline running on high-frequency CPU cores. Never route raw audio frames through GPU PCIe buses for basic acoustic feature extraction.
2. **Redis In-Memory Ring Buffers**: Expire audio ring buffers via TTL (300 seconds) to avoid Redis memory leaks.
3. **S3 Intelligent-Tiering / GCS Nearline**: Move encrypted audio archives to cold storage after 7 days, reducing storage costs by 70%.
4. **Spot / Preemptible Instances for Batch QA**: Use spot compute for nightly stress testing and acoustic model retraining.


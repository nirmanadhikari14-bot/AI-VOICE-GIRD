# Phase 28 — Optimized Architecture

## Overview

VoiceGuard AI Phase 28 introduces a full-stack real-time performance optimization layer across the audio streaming pipeline, AI inference, caching, database queries, and frontend bundle delivery.

## Architecture Diagram

```
                     WebSocket /ws/v1/audio
                            │
                    ┌───────▼────────┐
                    │  JitterBuffer  │  Sequence re-ordering, duplicate drop
                    └───────┬────────┘
                            │ PCM bytes (16-bit, 16kHz)
                    ┌───────▼────────┐
                    │ AudioRingBuffer│  10s pre-allocated int16 NumPy array
                    │  (320 KB)      │  Zero-copy sliding window extraction
                    └───────┬────────┘
                            │ float32 normalized window
              ┌─────────────▼─────────────────┐
              │  FastAcousticFeatureExtractor  │
              │  Shared FFT, ZCR, RMS          │
              │  One pass → all models share   │
              └────┬──────────┬───────────────┘
                   │          │
         ┌─────────▼─┐  ┌────▼──────────┐
         │ Conformer  │  │  Prosody/LID  │  Parallel inference
         └─────────┬─┘  └────┬──────────┘
                   │         │
              ┌────▼─────────▼────┐
              │  InferenceWorker  │  ThreadPoolExecutor(4 workers)
              │  Pool             │  Bounded queue (500), backpressure
              │  Warmed at boot   │  Warmup eliminates 85ms cold start
              └────────┬──────────┘
                       │
              ┌─────────▼──────────┐
              │   CacheManager     │  Tenant-isolated keys: vg:org_{id}:ns:key
              │   Redis (primary)  │  max_connections=20, socket_timeout=0.2s
              │   InMemoryLRU (fb) │  5,000 items, TTL eviction
              └─────────┬──────────┘
                       │
              ┌─────────▼──────────┐
              │  PostgreSQL Pool   │  pool_size=20, max_overflow=10
              │  + joinedload      │  Eliminates N+1 round-trips
              │  + composite idx   │  call_id, created_at indexed
              └────────────────────┘
```

## Component Descriptions

### AudioRingBuffer
- **Type**: Pre-allocated `np.zeros(capacity_samples, dtype=np.int16)` circular buffer
- **Capacity**: 10.0 s × 16,000 Hz = 160,000 samples = 320 KB
- **Write path**: O(1) slice assignment with circular wrap-around
- **Read path**: Zero-copy `np.ndarray` slice, optionally `.astype(float32) / 32768.0`
- **Memory**: Allocated once at session creation; never reallocated during streaming

### JitterBuffer
- **Type**: Min-heap (`heapq`) of `AudioPacket(seq, timestamp_ms, data)`
- **Purpose**: Absorbs network reordering, discards duplicates, enforces max queue depth
- **Policy**: Late frames (> 5 behind `next_expected_seq`) are dropped

### FastAcousticFeatureExtractor
- **Purpose**: Compute FFT, ZCR, RMS, spectral flux in a single pass shared by all models
- **Avoids**: Redundant FFTs per model (previously each model re-computed independently)
- **Output**: `SharedSpectralFeatures` dataclass passed to Conformer, Prosody, LID

### InferenceWorkerPool
- **Backend**: `ThreadPoolExecutor(max_workers=4)`
- **Purpose**: Keeps CPU/GPU inference off FastAPI's asyncio event loop
- **Warmup**: `warmup_models()` called in `startup_event` to pre-compile execution graphs
- **Backpressure**: Rejects tasks when active queue ≥ `max_queue_size=500`

### CacheManager
- **Primary**: `redis.asyncio` connection pool, `max_connections=20`
- **Fallback**: `InMemoryLRUTTLCache` (OrderedDict-based, thread-safe, 5,000 items)
- **Key format**: `vg:org_{organization_id}:{namespace}:{key}` — strict tenant isolation
- **TTL**: Configurable per call (default: risk scores 10s, explanations 30s)

### Database Optimizations
- Connection pool: `pool_size=20`, `max_overflow=10`, `pool_pre_ping=True`
- Composite indexes on `call_id` and `created_at` on all analytics tables
- `joinedload(RiskScore.call)` eliminates separate `SELECT` for the Call relationship

### Frontend Code Splitting
- **Before**: Single 831.47 kB monolithic bundle
- **After**: Vite Rollup `manualChunks` function:
  - `vendor-react`: React, ReactDOM, ReactRouter (234.85 kB)
  - `vendor-charts`: Recharts (397.77 kB, lazy-loaded)
  - `vendor-icons`: lucide-react (included in main chunk, tree-shaken)
  - Admin pages: 140.80 kB chunk (lazy-loaded via `React.lazy()`)
  - Each SOC page: 2–16 kB individual chunks
- **Initial load** reduced significantly; charts load only when navigating to dashboards


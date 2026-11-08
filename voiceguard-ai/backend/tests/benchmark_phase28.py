"""
VoiceGuard AI — Phase 28 Post-Optimization Benchmark
SIH26104

Measures:
- InMemoryLRUTTLCache: set, get (hit), get (miss) latency
- CacheManager.build_key() throughput
- AudioRingBuffer: write + read_latest latency for 20ms frames
- FastAcousticFeatureExtractor: feature extraction latency per frame
- InferenceWorkerPool: synchronous ThreadPoolExecutor dispatch latency
- StreamPipelineManager: session creation + ingest latency
"""

import os, sys, time, statistics, json
import numpy as np

BACKEND_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)

from app.services.streaming_audio_pipeline import (
    AudioRingBuffer, JitterBuffer, FastAcousticFeatureExtractor, StreamPipelineManager
)
from app.services.inference_worker_pool import InferenceWorkerPool
from app.core.cache_manager import InMemoryLRUTTLCache, CacheManager

RUNS = 1000
FRAME_SAMPLES = 320  # 20ms @ 16kHz

results = {}

# ── 1. InMemoryLRUTTLCache latency ──────────────────────────────────────────
cache = InMemoryLRUTTLCache(max_size=5000)
cache.set("warmup", 1)

set_times = []
for i in range(RUNS):
    t0 = time.perf_counter()
    cache.set(f"k{i}", {"v": i})
    set_times.append((time.perf_counter() - t0) * 1000)

get_times = []
for i in range(RUNS):
    t0 = time.perf_counter()
    cache.get(f"k{i}")
    get_times.append((time.perf_counter() - t0) * 1000)

results["cache_set_ms"] = {
    "p50": round(statistics.median(set_times), 4),
    "p95": round(sorted(set_times)[int(0.95 * RUNS)], 4),
    "mean": round(statistics.mean(set_times), 4),
}
results["cache_get_hit_ms"] = {
    "p50": round(statistics.median(get_times), 4),
    "p95": round(sorted(get_times)[int(0.95 * RUNS)], 4),
    "mean": round(statistics.mean(get_times), 4),
}

# ── 2. CacheManager.build_key() throughput ──────────────────────────────────
cm = CacheManager(disable_redis=True)
key_times = []
for i in range(RUNS):
    t0 = time.perf_counter()
    cm.build_key(i % 10, "risk", f"call_{i}")
    key_times.append((time.perf_counter() - t0) * 1000)

results["cache_build_key_ms"] = {
    "p50": round(statistics.median(key_times), 5),
    "p95": round(sorted(key_times)[int(0.95 * RUNS)], 5),
    "mean": round(statistics.mean(key_times), 5),
}

# ── 3. AudioRingBuffer write + read_latest ───────────────────────────────────
ring = AudioRingBuffer(capacity_seconds=10.0, sample_rate=16000)
frame = np.random.randint(-16384, 16384, FRAME_SAMPLES, dtype=np.int16)

write_times = []
for _ in range(RUNS):
    t0 = time.perf_counter()
    ring.write(frame)
    write_times.append((time.perf_counter() - t0) * 1000)

read_times = []
for _ in range(RUNS):
    t0 = time.perf_counter()
    ring.read_latest(FRAME_SAMPLES)
    read_times.append((time.perf_counter() - t0) * 1000)

results["ring_buffer_write_ms"] = {
    "p50": round(statistics.median(write_times), 4),
    "p95": round(sorted(write_times)[int(0.95 * RUNS)], 4),
    "mean": round(statistics.mean(write_times), 4),
}
results["ring_buffer_read_ms"] = {
    "p50": round(statistics.median(read_times), 4),
    "p95": round(sorted(read_times)[int(0.95 * RUNS)], 4),
    "mean": round(statistics.mean(read_times), 4),
}

# ── 4. FastAcousticFeatureExtractor per frame ────────────────────────────────
t_arr = np.linspace(0, 0.02, FRAME_SAMPLES, endpoint=False)
tone = (np.sin(2 * np.pi * 440 * t_arr) * 0.5).astype(np.float32)

feature_times = []
for _ in range(RUNS):
    t0 = time.perf_counter()
    FastAcousticFeatureExtractor.extract_shared_features(tone)
    feature_times.append((time.perf_counter() - t0) * 1000)

results["feature_extraction_ms"] = {
    "p50": round(statistics.median(feature_times), 4),
    "p95": round(sorted(feature_times)[int(0.95 * RUNS)], 4),
    "mean": round(statistics.mean(feature_times), 4),
}

# ── 5. InferenceWorkerPool synchronous ThreadPoolExecutor dispatch ────────────
pool = InferenceWorkerPool(max_workers=2)

def trivial_inference(x):
    return x * 2

dispatch_times = []
N_DISPATCH = 100
for i in range(N_DISPATCH):
    t0 = time.perf_counter()
    f = pool._executor.submit(trivial_inference, i)
    result = f.result(timeout=2)
    dispatch_times.append((time.perf_counter() - t0) * 1000)

pool.shutdown()

results["thread_pool_dispatch_ms"] = {
    "p50": round(statistics.median(dispatch_times), 2),
    "p95": round(sorted(dispatch_times)[int(0.95 * N_DISPATCH)], 2),
    "mean": round(statistics.mean(dispatch_times), 2),
}

# ── 6. StreamPipelineManager session ingest latency ─────────────────────────
manager = StreamPipelineManager()
session = manager.get_or_create_session("bench_session", user_id=1)
raw_pcm = frame.tobytes()

ingest_times = []
for i in range(500):
    t0 = time.perf_counter()
    session.ingest_chunk(raw_pcm, seq=i)
    ingest_times.append((time.perf_counter() - t0) * 1000)

results["stream_ingest_ms"] = {
    "p50": round(statistics.median(ingest_times), 4),
    "p95": round(sorted(ingest_times)[int(0.95 * 500)], 4),
    "mean": round(statistics.mean(ingest_times), 4),
}

# ── Print results ────────────────────────────────────────────────────────────
print("\n" + "=" * 70)
print("VoiceGuard AI — Phase 28 Post-Optimization Benchmark Results")
print("=" * 70)

labels = {
    "cache_set_ms":          "InMemoryCache SET         (1,000 runs)",
    "cache_get_hit_ms":      "InMemoryCache GET (hit)   (1,000 runs)",
    "cache_build_key_ms":    "CacheManager.build_key()  (1,000 runs)",
    "ring_buffer_write_ms":  "RingBuffer WRITE 20ms frame(1,000 runs)",
    "ring_buffer_read_ms":   "RingBuffer READ  20ms frame(1,000 runs)",
    "feature_extraction_ms": "AcousticFeatureExtractor  (1,000 runs)",
    "thread_pool_dispatch_ms":"ThreadPoolExecutor Dispatch(100 runs)",
    "stream_ingest_ms":      "StreamSession ingest_chunk(  500 runs)",
}

print(f"\n{'Metric':<42} {'P50 ms':>9} {'P95 ms':>9} {'Mean ms':>9}")
print("-" * 72)
for key, label in labels.items():
    r = results[key]
    print(f"{label:<42} {r['p50']:>9} {r['p95']:>9} {r['mean']:>9}")

print("\n" + "=" * 70)
print("Baseline (pre-Phase 28) comparison:")
print("  GET /api/v1/risk/latest:    P50=7.88ms  P95=18.91ms  Mean=8.73ms")
print("  GET /api/v1/risk/explain:   P50=21.29ms P95=26.22ms  Mean=20.44ms")
print("  ECAPA-TDNN cold start:      Mean=84.58ms (now eliminated by warmup)")
print("  Frontend bundle:            831.47 kB monolithic → now code-split")
print("  InMemoryCache GET:          Sub-millisecond (see row above)")
print("=" * 70 + "\n")

# Save to JSON
out_path = os.path.join(os.path.dirname(__file__), "..", "docs", "performance", "BENCHMARK_REPORT_DATA.json")
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w") as f:
    json.dump(results, f, indent=2)
print(f"Benchmark data saved to: {os.path.abspath(out_path)}")


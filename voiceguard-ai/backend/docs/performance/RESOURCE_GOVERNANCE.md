# Phase 28 — Resource Governance Policy

## Principle
VoiceGuard AI must maintain predictable latency and memory behavior even under sudden traffic spikes. All resource pools are bounded. Exceeding bounds triggers defined degradation, not crashes.

---

## Audio Streaming

| Resource | Bound | Action on Exceeded |
|---|---|---|
| Concurrent sessions | 100 | `RuntimeError` raised; client must wait or reconnect |
| Ring buffer capacity | 320 KB (10s audio) | Circular overwrite (oldest samples discarded) |
| Jitter buffer depth | 15 frames | Oldest frame evicted to maintain real-time SLA |
| Session idle timeout | 120 s | Stale session pruned on next `get_or_create_session` |

## AI Inference

| Resource | Bound | Action on Exceeded |
|---|---|---|
| Worker threads | 4 | Additional tasks queue in executor |
| Task queue depth | 500 | Tasks with count ≥ 500 return `status="rejected"` |
| Warmup on startup | Required | Skipped models produce logging.warning only |

## Caching

| Resource | Bound | Action on Exceeded |
|---|---|---|
| InMemoryLRU items | 5,000 | LRU eviction (least recently used item removed) |
| Redis connection pool | 20 | Surplus requests wait; timeout = 1.5s |
| Redis connection timeout | 0.2s (connect), 0.2s (socket) | Failover to in-memory LRU cache |
| Cache TTL (risk scores) | 10s | Stale cache serves data for at most 10s behind database |
| Cache TTL (explanations) | 30s | Tolerable staleness for read-heavy explanation data |

## Database

| Resource | Bound | Action on Exceeded |
|---|---|---|
| Connection pool | pool_size=20 | Additional connections use overflow |
| Overflow connections | 10 | Beyond 30, `pool_timeout=30s` exception |
| Pool recycle | 1,800s (30 min) | Prevents stale connections from cloud proxies |
| Pre-ping | Enabled | Dead connections detected before reuse |

## Frontend

| Resource | Bound | Action on Exceeded |
|---|---|---|
| Vendor chunk size | 400 kB | Warning threshold set to 600 kB; charts chunk ~398 kB |
| Lazy page load | Per route | `<Suspense>` spinner shown; never blocks other routes |

---

## Graceful Degradation Path

```
Redis unavailable
    └→ CacheManager falls back to InMemoryLRUTTLCache automatically
         └→ Cache miss → Database query (normal path, ~8ms P50)

Inference queue saturated (> 500 tasks)
    └→ InferenceTaskResult(status="rejected") returned immediately
         └→ Caller logs warning and uses last cached risk score

Audio stream capacity exceeded (100 sessions)
    └→ RuntimeError("Stream capacity exceeded") at gateway
         └→ Client receives WebSocket close frame; can retry

psutil unavailable (resource metrics)
    └→ /api/v1/system/performance returns zeros for CPU/memory fields
         └→ All other telemetry fields remain valid
```


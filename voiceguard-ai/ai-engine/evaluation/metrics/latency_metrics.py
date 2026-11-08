"""
VoiceGuard AI — Latency, Throughput & Scalability Benchmarking
Phase 27: SIH26104
"""

import numpy as np
from typing import List, Optional
from pydantic import BaseModel


class OperationalLatencyMetrics(BaseModel):
    sample_count: int
    mean_latency_ms: float
    median_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    min_latency_ms: float
    max_latency_ms: float
    throughput_samples_per_sec: float
    real_time_factor: float
    error_count: int
    error_rate: float


class LatencyMetricEngine:
    """
    Measures operational timing distributions, percentiles,
    throughput, and Real-Time Factor (RTF).
    """

    @classmethod
    def evaluate(
        cls,
        latencies_ms: List[float],
        audio_durations_sec: Optional[List[float]] = None,
        error_count: int = 0
    ) -> OperationalLatencyMetrics:
        if not latencies_ms:
            return OperationalLatencyMetrics(
                sample_count=0,
                mean_latency_ms=0.0,
                median_latency_ms=0.0,
                p95_latency_ms=0.0,
                p99_latency_ms=0.0,
                min_latency_ms=0.0,
                max_latency_ms=0.0,
                throughput_samples_per_sec=0.0,
                real_time_factor=0.0,
                error_count=error_count,
                error_rate=1.0 if error_count > 0 else 0.0
            )

        arr = np.array(latencies_ms)
        n = len(arr)

        mean_lat = float(np.mean(arr))
        median_lat = float(np.median(arr))
        p95_lat = float(np.percentile(arr, 95))
        p99_lat = float(np.percentile(arr, 99))
        min_lat = float(np.min(arr))
        max_lat = float(np.max(arr))

        # Throughput = N / total_time_sec
        total_time_sec = float(np.sum(arr)) / 1000.0
        throughput = round(n / max(total_time_sec, 1e-4), 2)

        # Real-time factor (RTF = total audio duration / total processing duration)
        if audio_durations_sec and len(audio_durations_sec) == n:
            total_audio_sec = float(np.sum(audio_durations_sec))
            rtf = round(total_audio_sec / max(total_time_sec, 1e-4), 2)
        else:
            rtf = 1.0  # Fallback

        err_rate = round(error_count / float(n + error_count), 4)

        return OperationalLatencyMetrics(
            sample_count=n,
            mean_latency_ms=round(mean_lat, 2),
            median_latency_ms=round(median_lat, 2),
            p95_latency_ms=round(p95_lat, 2),
            p99_latency_ms=round(p99_lat, 2),
            min_latency_ms=round(min_lat, 2),
            max_latency_ms=round(max_lat, 2),
            throughput_samples_per_sec=throughput,
            real_time_factor=rtf,
            error_count=error_count,
            error_rate=err_rate
        )

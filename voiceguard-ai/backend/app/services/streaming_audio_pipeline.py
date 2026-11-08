"""
VoiceGuard AI — Real-Time Streaming Audio Pipeline & Buffer Management
Phase 28: Performance Optimization (SIH26104)

High-performance, bounded-memory audio pipeline featuring:
- Pre-allocated circular ring buffer for zero-copy sliding windows
- Sequence-aware jitter buffer with packet loss & re-ordering handling
- Low-latency Voice Activity Detection (VAD) & speech segmentation
- Shared acoustic spectral feature cache to eliminate redundant FFTs
- Session-level backpressure and resource-bounded lifecycle management
"""

import time
import heapq
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
import numpy as np

logger = logging.getLogger(__name__)

CANONICAL_SAMPLE_RATE = 16000
SAMPLE_WIDTH_BYTES = 2  # 16-bit PCM
BYTES_PER_SAMPLE = 2
DEFAULT_RING_BUFFER_SECONDS = 10.0  # 10s circular buffer = 160,000 samples (320 KB)
DEFAULT_FRAME_DURATION_MS = 20      # 20ms frame = 320 samples = 640 bytes


@dataclass(order=True)
class AudioPacket:
    """Sequence-tagged audio packet for jitter buffer re-ordering."""
    seq: int
    timestamp_ms: float = field(compare=False)
    data: bytes = field(compare=False)
    is_padding: bool = field(default=False, compare=False)


class AudioRingBuffer:
    """
    Fixed-size, circular audio buffer pre-allocated in memory.
    Prevents memory allocation thrashing during continuous audio streaming.
    """

    def __init__(self, capacity_seconds: float = DEFAULT_RING_BUFFER_SECONDS, sample_rate: int = CANONICAL_SAMPLE_RATE):
        self.sample_rate = sample_rate
        self.capacity_samples = int(capacity_seconds * sample_rate)
        # Pre-allocate contiguous int16 array
        self._buffer = np.zeros(self.capacity_samples, dtype=np.int16)
        self._write_pos = 0
        self._total_written = 0
        self._overflow_count = 0

    def write(self, samples: np.ndarray) -> int:
        """Writes samples into circular buffer without unbounded reallocation."""
        n = len(samples)
        if n == 0:
            return 0

        if n >= self.capacity_samples:
            # Chunk is larger than buffer capacity; take only the latest window
            samples = samples[-self.capacity_samples:]
            n = len(samples)
            self._overflow_count += 1

        end_pos = (self._write_pos + n) % self.capacity_samples
        if self._write_pos + n <= self.capacity_samples:
            self._buffer[self._write_pos:self._write_pos + n] = samples
        else:
            first_chunk_size = self.capacity_samples - self._write_pos
            self._buffer[self._write_pos:] = samples[:first_chunk_size]
            self._buffer[:end_pos] = samples[first_chunk_size:]

        self._write_pos = end_pos
        self._total_written += n
        return n

    def write_bytes(self, pcm_bytes: bytes) -> int:
        """Parses 16-bit PCM bytes and inserts into circular buffer."""
        if not pcm_bytes:
            return 0
        samples = np.frombuffer(pcm_bytes, dtype=np.int16)
        return self.write(samples)

    def read_latest(self, num_samples: int) -> np.ndarray:
        """
        Extracts the most recent `num_samples` without modifying write pointers.
        Returns contiguous numpy array normalized to float32 (-1.0 to 1.0).
        """
        available = min(self._total_written, self.capacity_samples)
        read_len = min(num_samples, available)
        if read_len == 0:
            return np.zeros(0, dtype=np.float32)

        start_pos = (self._write_pos - read_len) % self.capacity_samples
        if start_pos + read_len <= self.capacity_samples:
            raw = self._buffer[start_pos:start_pos + read_len]
        else:
            raw = np.concatenate((
                self._buffer[start_pos:],
                self._buffer[:(start_pos + read_len) % self.capacity_samples]
            ))
        return raw.astype(np.float32) / 32768.0

    @property
    def fill_ratio(self) -> float:
        """Percentage of buffer capacity currently occupied."""
        return min(1.0, self._total_written / float(self.capacity_samples))

    @property
    def total_samples_written(self) -> int:
        return self._total_written

    @property
    def overflow_count(self) -> int:
        return self._overflow_count

    def reset(self):
        self._buffer.fill(0)
        self._write_pos = 0
        self._total_written = 0
        self._overflow_count = 0


class JitterBuffer:
    """
    Sequence-aware jitter buffer for network packet re-ordering,
    drift mitigation, and duplicate discard.
    """

    def __init__(self, max_buffer_frames: int = 15, expected_frame_samples: int = 320):
        self.max_buffer_frames = max_buffer_frames
        self.expected_frame_samples = expected_frame_samples
        self._heap: List[AudioPacket] = []
        self._next_expected_seq = 0
        self._dropped_late_frames = 0
        self._duplicate_frames = 0
        self._concealed_frames = 0
        self._seen_seqs = set()

    def push(self, seq: int, timestamp_ms: float, data: bytes) -> bool:
        """Pushes an incoming frame into the jitter window."""
        if seq in self._seen_seqs:
            self._duplicate_frames += 1
            return False

        if self._next_expected_seq > 0 and seq < self._next_expected_seq - 5:
            # Arrived too late; discard to prevent reverse drift
            self._dropped_late_frames += 1
            return False

        self._seen_seqs.add(seq)
        heapq.heappush(self._heap, AudioPacket(seq=seq, timestamp_ms=timestamp_ms, data=data))

        # Enforce maximum queue depth to prevent runaway latency
        if len(self._heap) > self.max_buffer_frames:
            # Evict earliest frame to preserve real-time SLA
            evicted = heapq.heappop(self._heap)
            self._next_expected_seq = evicted.seq + 1
            self._dropped_late_frames += 1

        return True

    def pop_in_order(self) -> Optional[AudioPacket]:
        """Returns the next in-sequence audio packet ready for ingestion."""
        if not self._heap:
            return None

        # If next packet is exactly what we expect or we are initializing
        if self._next_expected_seq == 0:
            pkt = heapq.heappop(self._heap)
            self._next_expected_seq = pkt.seq + 1
            return pkt

        peek = self._heap[0]
        if peek.seq == self._next_expected_seq:
            pkt = heapq.heappop(self._heap)
            self._next_expected_seq += 1
            return pkt

        # If buffer is accumulating too much, force advance
        if len(self._heap) >= self.max_buffer_frames // 2:
            pkt = heapq.heappop(self._heap)
            gap = pkt.seq - self._next_expected_seq
            if gap > 0:
                self._concealed_frames += gap
            self._next_expected_seq = pkt.seq + 1
            return pkt

        return None

    @property
    def queued_count(self) -> int:
        return len(self._heap)

    @property
    def metrics(self) -> Dict[str, int]:
        return {
            "dropped_late_frames": self._dropped_late_frames,
            "duplicate_frames": self._duplicate_frames,
            "concealed_frames": self._concealed_frames,
            "current_queued": len(self._heap),
        }


@dataclass
class SharedSpectralFeatures:
    """Pre-computed acoustic spectral features shared across model inference passes."""
    energy_rms: float
    zero_crossing_rate: float
    is_speech: bool
    fft_magnitudes: Optional[np.ndarray] = None
    high_frequency_ratio: float = 0.0
    spectral_flux: float = 0.0
    timestamp_ms: float = 0.0


class FastAcousticFeatureExtractor:
    """
    Vectorized acoustic feature extractor.
    Computes spectral metrics once and shares them with Conformer, Prosody, and LID.
    """

    @staticmethod
    def extract_shared_features(samples: np.ndarray, sample_rate: int = CANONICAL_SAMPLE_RATE) -> SharedSpectralFeatures:
        if len(samples) == 0:
            return SharedSpectralFeatures(energy_rms=0.0, zero_crossing_rate=0.0, is_speech=False)

        # 1. Energy RMS
        energy = float(np.sqrt(np.mean(samples ** 2)))

        # 2. Vectorized Zero-Crossing Rate
        signs = np.sign(samples)
        signs[signs == 0] = 1
        zcr = float(np.sum(np.abs(np.diff(signs))) / (2.0 * len(samples)))

        # 3. Fast VAD decision (threshold: energy > 0.015 and dynamic variance)
        var = float(np.var(samples))
        is_speech = energy > 0.012 and var > 0.0001

        # 4. Shared FFT magnitudes
        fft_vals = np.abs(np.fft.rfft(samples))
        total_energy = float(np.sum(fft_vals))
        if total_energy > 1e-6:
            hf_energy = float(np.sum(fft_vals[len(fft_vals) // 2:]))
            hf_ratio = hf_energy / total_energy
        else:
            hf_ratio = 0.0

        # 5. Spectral flux estimate
        diff = np.diff(samples)
        spectral_flux = float(np.var(diff))

        return SharedSpectralFeatures(
            energy_rms=round(energy, 5),
            zero_crossing_rate=round(zcr, 4),
            is_speech=is_speech,
            fft_magnitudes=fft_vals,
            high_frequency_ratio=round(hf_ratio, 4),
            spectral_flux=round(spectral_flux, 6),
            timestamp_ms=time.perf_counter() * 1000.0,
        )


class AudioStreamSession:
    """Manages an active real-time streaming audio channel."""

    def __init__(self, session_id: str, user_id: int, organization_id: Optional[int] = None):
        self.session_id = session_id
        self.user_id = user_id
        self.organization_id = organization_id
        self.ring_buffer = AudioRingBuffer(capacity_seconds=DEFAULT_RING_BUFFER_SECONDS)
        self.jitter_buffer = JitterBuffer()
        self.created_at = time.time()
        self.last_activity = time.time()
        self.total_frames_received = 0
        self.total_speech_frames = 0
        self.latest_features: Optional[SharedSpectralFeatures] = None
        self.processing_latencies_ms: List[float] = []

    def ingest_chunk(self, pcm_bytes: bytes, seq: Optional[int] = None) -> SharedSpectralFeatures:
        """Ingests frame, updates ring buffer, and computes shared acoustic features."""
        t0 = time.perf_counter()
        self.last_activity = time.time()
        self.total_frames_received += 1

        if seq is not None:
            self.jitter_buffer.push(seq, self.last_activity * 1000.0, pcm_bytes)
            in_order = self.jitter_buffer.pop_in_order()
            if in_order:
                self.ring_buffer.write_bytes(in_order.data)
        else:
            self.ring_buffer.write_bytes(pcm_bytes)

        # Extract features from the latest 30ms window
        recent_window = self.ring_buffer.read_latest(num_samples=480)  # 30ms @ 16kHz
        features = FastAcousticFeatureExtractor.extract_shared_features(recent_window)
        if features.is_speech:
            self.total_speech_frames += 1

        self.latest_features = features
        lat_ms = (time.perf_counter() - t0) * 1000.0
        self.processing_latencies_ms.append(lat_ms)
        if len(self.processing_latencies_ms) > 100:
            self.processing_latencies_ms = self.processing_latencies_ms[-100:]

        return features

    def get_analysis_segment(self, duration_seconds: float = 1.0) -> np.ndarray:
        """Returns the most recent contiguous float32 segment for AI model evaluation."""
        return self.ring_buffer.read_latest(num_samples=int(duration_seconds * CANONICAL_SAMPLE_RATE))

    @property
    def p95_latency_ms(self) -> float:
        if not self.processing_latencies_ms:
            return 0.0
        return float(np.percentile(self.processing_latencies_ms, 95))

    @property
    def speech_ratio(self) -> float:
        if self.total_frames_received == 0:
            return 0.0
        return self.total_speech_frames / float(self.total_frames_received)


class StreamPipelineManager:
    """Singleton session coordinator and stream resource governor."""

    MAX_ACTIVE_STREAMS = 100
    SESSION_TIMEOUT_SECONDS = 120.0

    def __init__(self):
        self._sessions: Dict[str, AudioStreamSession] = {}

    def get_or_create_session(self, session_id: str, user_id: int, organization_id: Optional[int] = None) -> AudioStreamSession:
        self.prune_stale_sessions()
        if session_id in self._sessions:
            return self._sessions[session_id]

        if len(self._sessions) >= self.MAX_ACTIVE_STREAMS:
            raise RuntimeError(f"Stream capacity exceeded ({len(self._sessions)}/{self.MAX_ACTIVE_STREAMS} active sessions).")

        session = AudioStreamSession(session_id=session_id, user_id=user_id, organization_id=organization_id)
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[AudioStreamSession]:
        return self._sessions.get(session_id)

    def close_session(self, session_id: str):
        if session_id in self._sessions:
            del self._sessions[session_id]

    def prune_stale_sessions(self):
        now = time.time()
        stale_keys = [
            sid for sid, s in self._sessions.items()
            if now - s.last_activity > self.SESSION_TIMEOUT_SECONDS
        ]
        for sid in stale_keys:
            del self._sessions[sid]

    @property
    def active_session_count(self) -> int:
        return len(self._sessions)

    def get_aggregate_metrics(self) -> Dict[str, Any]:
        sessions = list(self._sessions.values())
        if not sessions:
            return {
                "active_sessions": 0,
                "mean_p95_ingest_latency_ms": 0.0,
                "total_frames_processed": 0,
            }
        p95s = [s.p95_latency_ms for s in sessions]
        frames = sum(s.total_frames_received for s in sessions)
        return {
            "active_sessions": len(sessions),
            "mean_p95_ingest_latency_ms": round(float(np.mean(p95s)), 2),
            "total_frames_processed": frames,
        }


# Global Pipeline Manager Instance
stream_pipeline_manager = StreamPipelineManager()


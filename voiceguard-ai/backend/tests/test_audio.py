import pytest
import numpy as np
from app.services.audio_processor import AudioPreprocessor

def test_audio_preprocessor_is_speech():
    processor = AudioPreprocessor()
    
    # Create a noisy chunk to trigger the mock VAD (variance > 500)
    # np.random.randint produces uniform distribution, variance of [0, 100] is roughly 833
    noisy_bytes = np.random.randint(-100, 100, 1024, dtype=np.int16).tobytes()
    result = processor.process_chunk(noisy_bytes)
    
    assert result["is_speech"] is True
    assert "features" in result
    assert "mfcc" in result["features"]

def test_audio_preprocessor_no_speech():
    processor = AudioPreprocessor()
    
    # Create a quiet chunk to not trigger the mock VAD
    quiet_bytes = np.zeros(1024, dtype=np.int16).tobytes()
    result = processor.process_chunk(quiet_bytes)
    
    assert result["is_speech"] is False
    assert result["features"] is None

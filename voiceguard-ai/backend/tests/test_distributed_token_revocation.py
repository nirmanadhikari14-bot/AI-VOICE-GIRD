"""
VoiceGuard AI — Distributed Token Revocation & Multi-Instance Security Tests
Phase D: SIH26104
"""

import sys
import os
import time
import pytest
from datetime import timedelta
from unittest.mock import patch, MagicMock

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core import security
from app.core.config import settings
from app.api.deps import get_current_user
from fastapi import HTTPException


class TestDistributedTokenRevocation:
    """Verifies Redis-backed distributed token revocation and fail-closed policies."""

    def setup_method(self):
        security.clear_revoked_tokens()

    def teardown_method(self):
        security.clear_revoked_tokens()

    def test_token_fingerprint_generation(self):
        token = security.create_access_token(subject="user_123")
        fp = security.get_token_fingerprint(token)
        assert fp.startswith("jti:"), f"Expected jti: prefix, got {fp}"

        # Raw string without JTI
        raw_fp = security.get_token_fingerprint("non_jwt_random_token_string")
        assert raw_fp.startswith("sha:"), f"Expected sha: prefix, got {raw_fp}"

    def test_revoke_and_check_single_instance(self):
        token = security.create_access_token(subject="user_456")
        assert not security.is_token_revoked(token)

        security.revoke_token(token, expires_in_seconds=300)
        assert security.is_token_revoked(token)

    def test_multi_instance_revocation_simulation(self):
        """Simulates Instance A revoking a token and Instance B verifying revocation."""
        token = security.create_access_token(subject="user_789")

        # Mock Redis client shared between simulated Instance A and Instance B
        mock_redis = MagicMock()
        redis_storage = {}

        def mock_set(key, val, ex=None):
            redis_storage[key] = (val, time.time() + (ex or 300))
            return True

        def mock_exists(key):
            if key in redis_storage:
                val, exp = redis_storage[key]
                if time.time() < exp:
                    return 1
                del redis_storage[key]
            return 0

        mock_redis.set.side_effect = mock_set
        mock_redis.exists.side_effect = mock_exists

        with patch.object(security, "_get_redis_sync_client", return_value=mock_redis):
            # Instance A revokes token
            security.revoke_token(token, expires_in_seconds=300)

            # Instance B checks if token is revoked
            is_revoked = security.is_token_revoked(token)
            assert is_revoked is True, "Instance B must see token revoked by Instance A via distributed Redis"

    def test_production_fail_closed_policy(self):
        """In production, if Redis is unreachable during check, fail-closed must deny the token."""
        token = security.create_access_token(subject="user_prod")

        mock_failing_redis = MagicMock()
        mock_failing_redis.exists.side_effect = Exception("Redis network timeout / down")

        with patch.object(settings, "APP_ENV", "production"):
            with patch.object(security, "_get_redis_sync_client", return_value=mock_failing_redis):
                # Under fail-closed policy, an unreachable store must treat token as revoked / untrusted
                assert security.is_token_revoked(token) is True

    def test_expired_revocation_ttl(self):
        """Tokens past TTL should cleanly expire from revocation index."""
        token = security.create_access_token(subject="user_exp")
        # Revoke with 0 second TTL
        security.revoke_token(token, expires_in_seconds=-1)
        time.sleep(0.01)
        # Should now be expired and thus not active revoked
        assert not security.is_token_revoked(token)

from typing import Optional, Any
import json
from app.core.config import settings

class RedisClient:
    """
    Mock Redis client for local development without actual Redis instance.
    In Phase 6, we establish the interface.
    """
    def __init__(self):
        self._store = {}
        
    async def get(self, key: str) -> Optional[str]:
        return self._store.get(key)
        
    async def set(self, key: str, value: str, expire: int = None) -> bool:
        self._store[key] = value
        return True
        
    async def delete(self, key: str) -> bool:
        if key in self._store:
            del self._store[key]
        return True
        
    async def get_json(self, key: str) -> Optional[dict]:
        val = await self.get(key)
        return json.loads(val) if val else None
        
    async def set_json(self, key: str, value: dict, expire: int = None) -> bool:
        return await self.set(key, json.dumps(value), expire)

redis_client = RedisClient()

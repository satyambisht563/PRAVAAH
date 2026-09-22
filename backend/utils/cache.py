"""
PRAVAAH 3.0 — In-memory cache with TTL support.
"""
import time
from typing import Any, Optional


class TTLCache:
    """Simple in-memory cache with per-key TTL expiry."""

    def __init__(self):
        self._store: dict[str, tuple[Any, float]] = {}  # key -> (value, expires_at)

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.time() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl: int = 60):
        self._store[key] = (value, time.time() + ttl)

    def delete(self, key: str):
        self._store.pop(key, None)

    def clear(self):
        self._store.clear()

    def __len__(self):
        now = time.time()
        return sum(1 for _, exp in self._store.values() if exp > now)


# Module-level singleton
cache = TTLCache()

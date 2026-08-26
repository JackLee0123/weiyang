from __future__ import annotations

import threading
import time


class RateLimiter:
    """轻量进程内滑动窗口限流，适用于单实例部署。"""

    def __init__(self) -> None:
        self._buckets: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.time()
        with self._lock:
            hits = self._buckets.get(key)
            if hits is None:
                hits = []
                self._buckets[key] = hits
            # 清理窗口外的记录
            while hits and hits[0] <= now - window_seconds:
                hits.pop(0)
            if len(hits) >= limit:
                return False
            hits.append(now)
            # 空桶顺手清掉，避免内存缓慢增长
            if not hits:
                self._buckets.pop(key, None)
            return True

    def reset(self) -> None:
        with self._lock:
            self._buckets.clear()


rate_limiter = RateLimiter()

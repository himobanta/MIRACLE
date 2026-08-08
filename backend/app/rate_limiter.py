import os
import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import HTTPException, Request, status

class RateLimiter:
    """
    Configurable in-memory rate limiter per IP address for FastAPI endpoints.
    Reads environment variables (e.g. AUTH_RATE_LIMIT_LOGIN, AUTH_RATE_LIMIT_REGISTER).
    """
    def __init__(self, key_prefix: str, env_var: str, default_limit: str = "10/minute"):
        self.key_prefix = key_prefix
        self.env_var = env_var
        self.default_limit = default_limit
        self.history: Dict[str, List[float]] = defaultdict(list)

    def _parse_config(self) -> Tuple[int, int]:
        val = os.getenv(self.env_var, self.default_limit).strip().lower()
        if not val or val in ["0", "none", "off", "unlimited"]:
            return (999999, 60)

        if "/" in val:
            parts = val.split("/", 1)
            try:
                num = int(parts[0].strip())
            except ValueError:
                num = 10
            unit = parts[1].strip()
            if unit in ["minute", "min", "m"]:
                window = 60
            elif unit in ["hour", "hr", "h"]:
                window = 3600
            elif unit in ["second", "sec", "s"]:
                window = 1
            else:
                try:
                    window = int(unit.replace("s", ""))
                except ValueError:
                    window = 60
            return (num, window)
        else:
            try:
                num = int(val)
                return (num, 60)
            except ValueError:
                return (10, 60)

    def __call__(self, request: Request):
        max_requests, window_seconds = self._parse_config()
        if max_requests >= 999999:
            return

        client_ip = request.client.host if (request and request.client) else "127.0.0.1"
        key = f"{self.key_prefix}:{client_ip}"
        now = time.time()

        # Filter out timestamps outside current window
        timestamps = [t for t in self.history[key] if now - t < window_seconds]
        if len(timestamps) >= max_requests:
            retry_after = int(window_seconds - (now - timestamps[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)}
            )

        timestamps.append(now)
        self.history[key] = timestamps

    def reset(self):
        """Clear historical entries for clean test runs."""
        self.history.clear()

limiter_login = RateLimiter("login", "AUTH_RATE_LIMIT_LOGIN", "100/minute")
limiter_register = RateLimiter("register", "AUTH_RATE_LIMIT_REGISTER", "50/minute")

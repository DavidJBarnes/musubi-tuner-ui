"""Async log file streaming (tail -f equivalent)."""

import asyncio
import os
import re
from collections.abc import AsyncGenerator


async def tail_log(log_path: str, poll_interval: float = 0.5) -> AsyncGenerator[str, None]:
    """Async generator that yields new lines from a log file (like tail -f)."""
    while not os.path.exists(log_path):
        await asyncio.sleep(poll_interval)

    # Start near the end of existing files to avoid flooding with history.
    try:
        size = os.path.getsize(log_path)
        offset = max(0, size - 4096)
    except OSError:
        offset = 0

    while True:
        try:
            with open(log_path, "r", errors="replace") as f:
                f.seek(offset)
                new_data = f.read()
                if new_data:
                    offset = f.tell()
                    for line in re.split(r"[\r\n]+", new_data):
                        if line:
                            yield line
                else:
                    await asyncio.sleep(poll_interval)
        except OSError:
            await asyncio.sleep(poll_interval)

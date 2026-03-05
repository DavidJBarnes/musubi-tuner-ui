import asyncio
import os
import re
from collections.abc import AsyncGenerator


async def tail_log(log_path: str, poll_interval: float = 0.5) -> AsyncGenerator[str, None]:
    """Async generator that yields new lines from a log file (like tail -f)."""
    while not os.path.exists(log_path):
        await asyncio.sleep(poll_interval)

    offset = 0
    while True:
        try:
            async with asyncio.Lock():
                with open(log_path, "r", errors="replace") as f:
                    f.seek(offset)
                    new_data = f.read()
                    if new_data:
                        offset = f.tell()
                        # tqdm uses \r to overwrite lines, split on both
                        for line in re.split(r"[\r\n]+", new_data):
                            if line:
                                yield line
                    else:
                        await asyncio.sleep(poll_interval)
        except OSError:
            await asyncio.sleep(poll_interval)

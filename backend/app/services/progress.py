import os
import re

# Match tqdm output like: " 45%|████      | 9/20 [02:15<02:45, 15.00s/it]"
TQDM_RE = re.compile(r"(\d+)%\|.*?\|\s*(\d+)/(\d+)")
# Match phase markers like: "### PHASE: caching_latents ###"
PHASE_RE = re.compile(r"### PHASE:\s*(\S+)\s*###")


def parse_progress_from_log(log_path: str) -> dict:
    """Read the last 50 lines of a log file and extract progress info."""
    if not log_path or not os.path.exists(log_path):
        return {"current": 0, "total": 0, "phase": None}

    try:
        with open(log_path, "rb") as f:
            # Read last 8KB for efficiency
            f.seek(0, 2)
            size = f.tell()
            f.seek(max(0, size - 8192))
            tail = f.read().decode("utf-8", errors="replace")
    except OSError:
        return {"current": 0, "total": 0, "phase": None}

    lines = tail.split("\n")

    phase = None
    current = 0
    total = 0

    for line in lines:
        pm = PHASE_RE.search(line)
        if pm:
            phase = pm.group(1)

        tm = TQDM_RE.search(line)
        if tm:
            current = int(tm.group(2))
            total = int(tm.group(3))

    return {"current": current, "total": total, "phase": phase}

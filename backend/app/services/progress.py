import os
import re

# Match tqdm output like: " 45%|████      | 9/20 [02:15<02:45, 15.00s/it]"
TQDM_RE = re.compile(r"(\d+)%\|.*?\|\s*(\d+)/(\d+)")
# Match speed from tqdm like: "78.62s/it" or "2076.39it/s"
SPEED_RE = re.compile(r"(\d+\.?\d*)(s/it|it/s)")
# Match phase markers like: "### PHASE: caching_latents ###"
PHASE_RE = re.compile(r"### PHASE:\s*(\S+)\s*###")
# Match epoch lines like: "epoch 1/10"
EPOCH_RE = re.compile(r"epoch\s+(\d+)/(\d+)")


def parse_progress_from_log(log_path: str) -> dict:
    """Read the tail of a log file and extract progress info."""
    if not log_path or not os.path.exists(log_path):
        return {"current": 0, "total": 0, "phase": None, "speed": None, "epoch": 0, "total_epochs": 0}

    try:
        with open(log_path, "rb") as f:
            # Read last 32KB — tqdm uses \r so lines can be very long
            f.seek(0, 2)
            size = f.tell()
            f.seek(max(0, size - 32768))
            tail = f.read().decode("utf-8", errors="replace")
    except OSError:
        return {"current": 0, "total": 0, "phase": None, "speed": None, "epoch": 0, "total_epochs": 0}

    # tqdm overwrites with \r, so split on both \n and \r
    lines = re.split(r"[\r\n]+", tail)

    phase = None
    current = 0
    total = 0
    speed = None
    epoch = 0
    total_epochs = 0

    for line in lines:
        pm = PHASE_RE.search(line)
        if pm:
            phase = pm.group(1)

        tm = TQDM_RE.search(line)
        if tm:
            current = int(tm.group(2))
            total = int(tm.group(3))

        sm = SPEED_RE.search(line)
        if sm:
            val = float(sm.group(1))
            unit = sm.group(2)
            speed = val if unit == "s/it" else (1.0 / val if val > 0 else None)

        em = EPOCH_RE.search(line)
        if em:
            epoch = int(em.group(1))
            total_epochs = int(em.group(2))

    return {
        "current": current,
        "total": total,
        "phase": phase,
        "speed": speed,
        "epoch": epoch,
        "total_epochs": total_epochs,
    }

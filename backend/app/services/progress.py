"""Training progress parser for log files."""

import logging
import os
import re

logger = logging.getLogger(__name__)

# Match tqdm output like: " 45%|████      | 9/20 [02:15<02:45, 15.00s/it]"
TQDM_RE = re.compile(r"(\d+)%\|.*?\|\s*(\d+)/(\d+)")
# Match tqdm without total like: "5it [04:16, 51.19s/it]"
TQDM_NO_TOTAL_RE = re.compile(r"(\d+)it\s*\[")
# Match speed from tqdm like: "78.62s/it" or "2076.39it/s" (may have comma-separated speeds)
SPEED_RE = re.compile(r"(\d[\d,.]*)(s/it|it/s)")
# Match average loss like: "avr_loss=0.0812"
AVR_LOSS_RE = re.compile(r"avr_loss=([\d.]+)")
# Match phase markers like: "### PHASE: caching_latents ###"
PHASE_RE = re.compile(r"### PHASE:\s*(\S+)\s*###")
# Match epoch lines like: "epoch 1/10"
EPOCH_RE = re.compile(r"epoch\s+(\d+)/(\d+)")


def parse_progress_from_log(log_path: str | None) -> dict:
    """Read the tail of a log file and extract progress info."""
    if not log_path or not os.path.exists(log_path):
        return {"current": 0, "total": 0, "phase": None, "speed": None, "epoch": 0, "total_epochs": 0, "avr_loss": None}

    try:
        with open(log_path, "rb") as f:
            # Read last 32KB — tqdm uses \r so lines can be very long
            f.seek(0, 2)
            size = f.tell()
            f.seek(max(0, size - 32768))
            tail = f.read().decode("utf-8", errors="replace")
    except OSError:
        return {"current": 0, "total": 0, "phase": None, "speed": None, "epoch": 0, "total_epochs": 0, "avr_loss": None}

    # tqdm overwrites with \r, so split on both \n and \r
    lines = re.split(r"[\r\n]+", tail)

    phase = None
    current = 0
    total = 0
    speed = None
    epoch = 0
    total_epochs = 0
    avr_loss = None

    for line in lines:
        pm = PHASE_RE.search(line)
        if pm:
            phase = pm.group(1)

        tm = TQDM_RE.search(line)
        if tm:
            current = int(tm.group(2))
            total = int(tm.group(3))
        else:
            tn = TQDM_NO_TOTAL_RE.search(line)
            if tn:
                current = int(tn.group(1))

        sm = SPEED_RE.search(line)
        if sm:
            raw = sm.group(1).replace(",", "")
            val = float(raw)
            unit = sm.group(2)
            speed = val if unit == "s/it" else (1.0 / val if val > 0 else None)

        em = EPOCH_RE.search(line)
        if em:
            epoch = int(em.group(1))
            total_epochs = int(em.group(2))

        lm = AVR_LOSS_RE.search(line)
        if lm:
            avr_loss = float(lm.group(1))

    return {
        "current": current,
        "total": total,
        "phase": phase,
        "speed": speed,
        "epoch": epoch,
        "total_epochs": total_epochs,
        "avr_loss": avr_loss,
    }

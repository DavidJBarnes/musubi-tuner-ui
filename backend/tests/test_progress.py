"""Unit tests for training progress log parsing."""

import os
import tempfile

from app.services.progress import parse_progress_from_log


def _write_log(content: str) -> str:
    """Write content to a temp file and return the path."""
    fd, path = tempfile.mkstemp(suffix=".log")
    with os.fdopen(fd, "w") as f:
        f.write(content)
    return path


def test_empty_log():
    result = parse_progress_from_log(None)
    assert result["current"] == 0
    assert result["phase"] is None


def test_nonexistent_file():
    result = parse_progress_from_log("/nonexistent/file.log")
    assert result["current"] == 0


def test_phase_detection():
    path = _write_log('echo "### PHASE: caching_latents ###"\nprocessing...\n')
    result = parse_progress_from_log(path)
    assert result["phase"] == "caching_latents"
    os.unlink(path)


def test_tqdm_progress():
    path = _write_log(" 45%|████      | 9/20 [02:15<02:45, 15.00s/it]\n")
    result = parse_progress_from_log(path)
    assert result["current"] == 9
    assert result["total"] == 20
    os.unlink(path)


def test_tqdm_speed_seconds_per_it():
    path = _write_log(" 50%|█████     | 10/20 [05:00<05:00, 30.00s/it]\n")
    result = parse_progress_from_log(path)
    assert result["speed"] == 30.0
    os.unlink(path)


def test_tqdm_speed_it_per_second():
    path = _write_log(" 50%|█████     | 10/20 [00:05<00:05, 2.00it/s]\n")
    result = parse_progress_from_log(path)
    assert result["speed"] == pytest.approx(0.5)
    os.unlink(path)


def test_epoch_parsing():
    path = _write_log("epoch 3/10\n 30%|███       | 6/20\n")
    result = parse_progress_from_log(path)
    assert result["epoch"] == 3
    assert result["total_epochs"] == 10
    os.unlink(path)


def test_avr_loss_parsing():
    path = _write_log(" 50%|█████     | 10/20 [05:00<05:00, 30.00s/it, avr_loss=0.0812]\n")
    result = parse_progress_from_log(path)
    assert result["avr_loss"] == pytest.approx(0.0812)
    os.unlink(path)


def test_done_phase():
    path = _write_log('### PHASE: training ###\ntraining...\n### PHASE: done ###\n')
    result = parse_progress_from_log(path)
    assert result["phase"] == "done"
    os.unlink(path)


def test_tqdm_no_total():
    path = _write_log("5it [04:16, 51.19s/it]\n")
    result = parse_progress_from_log(path)
    assert result["current"] == 5
    os.unlink(path)


import pytest

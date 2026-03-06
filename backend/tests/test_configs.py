"""Tests for config and preset API endpoints."""

import json
from pathlib import Path
from unittest.mock import patch

import pytest


def test_list_presets(client):
    res = client.get("/api/configs/presets")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_get_preset_not_found(client):
    res = client.get("/api/configs/presets/nonexistent.json")
    assert res.status_code == 404


def test_generate_toml(client):
    res = client.post("/api/configs/generate-toml", json={
        "dataset_config": {
            "video_directory": "/tmp/videos",
            "cache_directory": "/tmp/cache",
            "resolution": [480, 832],
            "caption_extension": ".txt",
            "batch_size": 1,
            "enable_bucket": False,
            "target_frames": [61],
            "frame_extraction": "full",
            "num_repeats": 1,
        },
        "training_args": {
            "task": "i2v-A14B",
            "dit_path": "/tmp/dit",
            "vae_path": "/tmp/vae",
            "t5_path": "/tmp/t5",
            "network_dim": 16,
            "network_alpha": 16,
            "loraplus_lr_ratio": 4,
            "timestep_sampling": "shift",
            "discrete_flow_shift": 5.0,
            "min_timestep": 900,
            "max_timestep": 1000,
            "preserve_distribution_shape": True,
            "optimizer_type": "adamw8bit",
            "learning_rate": 2e-4,
            "lr_scheduler": "cosine",
            "max_train_epochs": 10,
            "save_every_n_epochs": 1,
            "mixed_precision": "fp16",
            "fp8_base": True,
            "fp8_scaled": True,
            "gradient_checkpointing": True,
            "blocks_to_swap": 36,
            "output_dir": "/tmp/output",
            "output_name": "test",
            "logging_dir": "/tmp/logs",
            "seed": 42,
        },
    })
    assert res.status_code == 200
    assert "toml" in res.json()
    assert "/tmp/videos" in res.json()["toml"]


def test_validate_config_invalid_paths(client):
    res = client.post("/api/configs/validate", json={
        "dataset_config": {
            "video_directory": "/nonexistent/videos",
            "cache_directory": "/tmp/cache",
            "resolution": [480, 832],
            "caption_extension": ".txt",
            "batch_size": 1,
            "enable_bucket": False,
            "target_frames": [61],
            "frame_extraction": "full",
            "num_repeats": 1,
        },
        "training_args": {
            "task": "i2v-A14B",
            "dit_path": "/nonexistent/dit",
            "vae_path": "",
            "t5_path": "",
            "network_dim": 16,
            "network_alpha": 16,
            "loraplus_lr_ratio": 4,
            "timestep_sampling": "shift",
            "discrete_flow_shift": 5.0,
            "min_timestep": 900,
            "max_timestep": 1000,
            "preserve_distribution_shape": True,
            "optimizer_type": "adamw8bit",
            "learning_rate": 2e-4,
            "lr_scheduler": "cosine",
            "max_train_epochs": 10,
            "save_every_n_epochs": 1,
            "mixed_precision": "fp16",
            "fp8_base": True,
            "fp8_scaled": True,
            "gradient_checkpointing": True,
            "blocks_to_swap": 36,
            "output_dir": "",
            "output_name": "test",
            "logging_dir": "",
            "seed": 42,
        },
    })
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is False
    assert len(data["errors"]) >= 1

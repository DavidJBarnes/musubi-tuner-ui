"""Unit tests for job runner script and TOML generation."""

from app.schemas import DatasetConfigForm, TrainingArgsForm
from app.services.job_runner import generate_dataset_toml, generate_run_script


def _make_training_args(**overrides) -> TrainingArgsForm:
    defaults = {
        "task": "i2v-A14B",
        "dit_path": "/tmp/dit.safetensors",
        "vae_path": "/tmp/vae.pth",
        "t5_path": "/tmp/t5.pth",
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
    }
    defaults.update(overrides)
    return TrainingArgsForm(**defaults)


def _make_dataset_cfg(**overrides) -> DatasetConfigForm:
    defaults = {
        "video_directory": "/tmp/videos",
        "cache_directory": "/tmp/cache",
        "resolution": [480, 832],
        "caption_extension": ".txt",
        "batch_size": 1,
        "enable_bucket": False,
        "target_frames": [61],
        "frame_extraction": "full",
        "num_repeats": 1,
    }
    defaults.update(overrides)
    return DatasetConfigForm(**defaults)


def test_generate_dataset_toml():
    cfg = _make_dataset_cfg()
    toml = generate_dataset_toml(cfg)
    assert "/tmp/videos" in toml
    assert "/tmp/cache" in toml
    assert "resolution" in toml


def test_generate_dataset_toml_custom_resolution():
    cfg = _make_dataset_cfg(resolution=[720, 1280])
    toml = generate_dataset_toml(cfg)
    assert "720" in toml
    assert "1280" in toml


class FakeJob:
    """Minimal mock for Job model used by generate_run_script."""
    def __init__(self, name="test", log_file="/tmp/logs/abc.log"):
        self.id = "abc"
        self.name = name
        self.log_file = log_file


def test_generate_run_script_full():
    job = FakeJob()
    script = generate_run_script(
        job, _make_dataset_cfg(), _make_training_args(),
        musubi_path="/opt/musubi",
        comfyui_models_path="/opt/models",
    )
    assert "#!/bin/bash" in script
    assert "PHASE: caching_latents" in script
    assert "PHASE: caching_text" in script
    assert "PHASE: training" in script
    assert "PHASE: done" in script
    assert "--fp8_base" in script
    assert "--blocks_to_swap 36" in script


def test_generate_run_script_skip_phase():
    job = FakeJob()
    script = generate_run_script(
        job, _make_dataset_cfg(), _make_training_args(),
        musubi_path="/opt/musubi",
        comfyui_models_path="/opt/models",
        skip_to_phase="training",
    )
    assert "PHASE: caching_latents" not in script
    assert "PHASE: caching_text" not in script
    assert "PHASE: training" in script


def test_generate_run_script_resume():
    job = FakeJob()
    script = generate_run_script(
        job, _make_dataset_cfg(), _make_training_args(),
        musubi_path="/opt/musubi",
        comfyui_models_path="/opt/models",
        resume_from="/tmp/state-dir",
    )
    assert "--resume /tmp/state-dir" in script


def test_generate_run_script_network_weights():
    job = FakeJob()
    script = generate_run_script(
        job, _make_dataset_cfg(), _make_training_args(),
        musubi_path="/opt/musubi",
        comfyui_models_path="/opt/models",
        network_weights="/tmp/weights.safetensors",
    )
    assert "--network_weights /tmp/weights.safetensors" in script

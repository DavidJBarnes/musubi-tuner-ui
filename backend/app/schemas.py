from datetime import datetime

from pydantic import BaseModel


# --- Settings ---
class SettingsRead(BaseModel):
    musubi_tuner_path: str = ""
    comfyui_models_path: str = ""
    default_output_dir: str = ""
    default_dataset_dir: str = ""


class SettingsUpdate(BaseModel):
    musubi_tuner_path: str | None = None
    comfyui_models_path: str | None = None
    default_output_dir: str | None = None
    default_dataset_dir: str | None = None


# --- GPU ---
class GpuStats(BaseModel):
    name: str = ""
    vram_used_mb: int = 0
    vram_total_mb: int = 0
    utilization_pct: int = 0
    temperature_c: int = 0
    available: bool = False


# --- Dataset ---
class VideoInfo(BaseModel):
    name: str
    filename: str
    caption: str = ""
    has_caption: bool = False
    size_bytes: int = 0
    frame_count: int | None = None


# --- Config / TOML ---
class DatasetConfigForm(BaseModel):
    video_directory: str
    cache_directory: str
    resolution: list[int] = [480, 832]
    caption_extension: str = ".txt"
    batch_size: int = 1
    enable_bucket: bool = False
    target_frames: list[int] = [61]
    frame_extraction: str = "full"
    num_repeats: int = 1


class TrainingArgsForm(BaseModel):
    # Model
    task: str = "i2v-A14B"
    dit_path: str = ""
    vae_path: str = ""
    t5_path: str = ""
    # LoRA
    network_dim: int = 16
    network_alpha: int = 16
    loraplus_lr_ratio: int = 4
    # Timesteps
    timestep_sampling: str = "shift"
    discrete_flow_shift: float = 5.0
    min_timestep: int = 0
    max_timestep: int = 1000
    preserve_distribution_shape: bool = True
    # Optimizer
    optimizer_type: str = "adamw8bit"
    learning_rate: float = 2e-4
    lr_scheduler: str = "cosine"
    max_train_epochs: int = 20
    save_every_n_epochs: int = 2
    # Memory
    mixed_precision: str = "fp16"
    fp8_base: bool = True
    fp8_scaled: bool = True
    gradient_checkpointing: bool = True
    blocks_to_swap: int = 20
    # Output
    output_dir: str = ""
    output_name: str = ""
    logging_dir: str = ""
    seed: int = 42


class PresetInfo(BaseModel):
    name: str
    filename: str
    description: str = ""


class TomlGenerateRequest(BaseModel):
    dataset_config: DatasetConfigForm
    training_args: TrainingArgsForm


# --- Jobs ---
class JobCreate(BaseModel):
    name: str
    job_type: str  # high_noise | low_noise | both
    dataset_config: DatasetConfigForm
    training_args: TrainingArgsForm


class JobRead(BaseModel):
    id: str
    name: str
    status: str
    job_type: str
    pid: int | None = None
    progress_current: int = 0
    progress_total: int = 0
    current_phase: str | None = None
    output_dir: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_message: str | None = None

    model_config = {"from_attributes": True}


class JobDetail(JobRead):
    dataset_config: str = ""
    training_args: str = ""
    tensorboard_dir: str | None = None
    log_file: str | None = None

    model_config = {"from_attributes": True}


class LossPoint(BaseModel):
    step: int
    value: float

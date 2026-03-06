import type {
  DatasetConfig,
  DatasetInfo,
  GpuStats,
  Job,
  JobDetail,
  JobStats,
  LossPoint,
  Settings,
  TrainingArgs,
  VideoInfo,
} from "../api/types";

let counter = 0;
function uid() {
  return `test-${++counter}`;
}

export function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: uid(),
    name: "Test Job",
    status: "training",
    job_type: "high_noise",
    pid: 12345,
    progress_current: 50,
    progress_total: 100,
    current_phase: "training",
    output_dir: "/tmp/output",
    created_at: "2026-03-01T12:00:00",
    started_at: "2026-03-01T12:01:00",
    completed_at: null,
    error_message: null,
    queue_position: null,
    dataset_name: "my-dataset",
    ...overrides,
  };
}

export function makeJobDetail(overrides: Partial<JobDetail> = {}): JobDetail {
  return {
    ...makeJob(),
    dataset_config: "{}",
    training_args: "{}",
    tensorboard_dir: "/tmp/tb",
    log_file: "/tmp/log.txt",
    ...overrides,
  };
}

export function makeGpuStats(overrides: Partial<GpuStats> = {}): GpuStats {
  return {
    name: "NVIDIA RTX 3090",
    vram_used_mb: 8000,
    vram_total_mb: 24576,
    utilization_pct: 85,
    temperature_c: 72,
    available: true,
    ...overrides,
  };
}

export function makeVideoInfo(overrides: Partial<VideoInfo> = {}): VideoInfo {
  return {
    name: "clip001",
    filename: "clip001.mp4",
    caption: "A person walking",
    has_caption: true,
    size_bytes: 5242880,
    ...overrides,
  };
}

export function makeDatasetInfo(overrides: Partial<DatasetInfo> = {}): DatasetInfo {
  return {
    id: uid(),
    name: "test-dataset",
    video_count: 10,
    created_at: "2026-03-01T10:00:00",
    ...overrides,
  };
}

export function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    musubi_tuner_path: "/home/user/musubi-tuner",
    comfyui_models_path: "/home/user/models",
    default_output_dir: "/home/user/output",
    default_dataset_dir: "/home/user/datasets",
    ...overrides,
  };
}

export function makeLossPoints(count = 5): LossPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    step: (i + 1) * 10,
    value: 0.5 - i * 0.05,
  }));
}

export function makeJobStats(overrides: Partial<JobStats> = {}): JobStats {
  return {
    speed: 70.5,
    epoch: 3,
    total_epochs: 10,
    current: 714,
    total: 2380,
    save_every_n_epochs: 2,
    avr_loss: 0.0345,
    ...overrides,
  };
}

export function makeDatasetConfig(overrides: Partial<DatasetConfig> = {}): DatasetConfig {
  return {
    video_directory: "/data/videos",
    cache_directory: "/data/cache",
    resolution: [480, 832],
    caption_extension: ".txt",
    batch_size: 1,
    enable_bucket: false,
    target_frames: [61],
    frame_extraction: "full",
    num_repeats: 1,
    ...overrides,
  };
}

export function makeTrainingArgs(overrides: Partial<TrainingArgs> = {}): TrainingArgs {
  return {
    task: "i2v-A14B",
    dit_path: "/models/dit.safetensors",
    vae_path: "/models/vae.pth",
    t5_path: "/models/t5.pth",
    network_dim: 16,
    network_alpha: 16,
    loraplus_lr_ratio: 4,
    timestep_sampling: "shift",
    discrete_flow_shift: 5.0,
    min_timestep: 900,
    max_timestep: 1000,
    preserve_distribution_shape: true,
    optimizer_type: "adamw8bit",
    learning_rate: 2e-4,
    lr_scheduler: "cosine",
    max_train_epochs: 10,
    save_every_n_epochs: 1,
    mixed_precision: "fp16",
    fp8_base: true,
    fp8_scaled: true,
    gradient_checkpointing: true,
    blocks_to_swap: 36,
    output_dir: "/output",
    output_name: "hardcut_lora",
    logging_dir: "/output/logs",
    seed: 42,
    ...overrides,
  };
}

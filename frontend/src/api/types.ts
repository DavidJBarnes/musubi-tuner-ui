export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface GpuStats {
  name: string;
  vram_used_mb: number;
  vram_total_mb: number;
  utilization_pct: number;
  temperature_c: number;
  available: boolean;
}

export interface Settings {
  musubi_tuner_path: string;
  comfyui_models_path: string;
  default_output_dir: string;
  default_dataset_dir: string;
}

export interface VideoInfo {
  name: string;
  filename: string;
  caption: string;
  has_caption: boolean;
  size_bytes: number;
}

export interface DatasetInfo {
  id: string;
  name: string;
  video_count: number;
  created_at: string;
}

export interface PresetInfo {
  name: string;
  filename: string;
  description: string;
}

export interface DatasetConfig {
  video_directory: string;
  cache_directory: string;
  resolution: number[];
  caption_extension: string;
  batch_size: number;
  enable_bucket: boolean;
  target_frames: number[];
  frame_extraction: string;
  num_repeats: number;
}

export interface TrainingArgs {
  task: string;
  dit_path: string;
  vae_path: string;
  t5_path: string;
  network_dim: number;
  network_alpha: number;
  loraplus_lr_ratio: number;
  timestep_sampling: string;
  discrete_flow_shift: number;
  min_timestep: number;
  max_timestep: number;
  preserve_distribution_shape: boolean;
  optimizer_type: string;
  learning_rate: number;
  lr_scheduler: string;
  max_train_epochs: number;
  save_every_n_epochs: number;
  mixed_precision: string;
  fp8_base: boolean;
  fp8_scaled: boolean;
  gradient_checkpointing: boolean;
  blocks_to_swap: number;
  output_dir: string;
  output_name: string;
  logging_dir: string;
  seed: number;
}

export interface SampleConfig {
  enabled: boolean;
  image_path: string;
  prompt: string;
}

export interface SampleInfo {
  id: string;
  cycle: number;
  high_checkpoint: string;
  low_checkpoint: string;
  prompt: string;
  status: string;
  error_message: string | null;
  created_at: string;
  duration_seconds: number | null;
}

export interface Job {
  id: string;
  name: string;
  status: string;
  job_type: string;
  pid: number | null;
  progress_current: number;
  progress_total: number;
  current_phase: string | null;
  output_dir: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  queue_position: number | null;
  dataset_name: string | null;
  interleaved_cycle: number | null;
  interleaved_phase: string | null;
  interleaved_total_cycles: number | null;
}

export interface JobDetail extends Job {
  dataset_config: string;
  training_args: string;
  training_args_low: string | null;
  sample_config: string | null;
  tensorboard_dir: string | null;
  log_file: string | null;
}

export interface LossPoint {
  step: number;
  value: number;
}

export interface JobStats {
  speed: number | null;
  epoch: number;
  total_epochs: number;
  current: number;
  total: number;
  save_every_n_epochs: number;
  avr_loss: number | null;
  interleaved_cycle?: number | null;
  interleaved_phase?: string | null;
  interleaved_total_cycles?: number | null;
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import { api, fetcher } from "../../api/client";
import type { DatasetConfig, DatasetInfo, Job, PaginatedResponse, SampleConfig, Settings, TrainingArgs } from "../../api/types";
import { useJobs } from "../../hooks/useJobs";
import { DatasetTomlForm } from "../config/DatasetTomlForm";
import { SampleConfigForm } from "../config/SampleConfigForm";
import { TrainingArgsForm } from "../config/TrainingArgsForm";

const DEFAULT_DATASET: DatasetConfig = {
  video_directory: "",
  cache_directory: "",
  resolution: [480, 832],
  caption_extension: ".txt",
  batch_size: 1,
  enable_bucket: false,
  target_frames: [61],
  frame_extraction: "full",
  num_repeats: 1,
};

const DEFAULT_HIGH_ARGS: TrainingArgs = {
  task: "i2v-A14B",
  dit_path: "",
  vae_path: "",
  t5_path: "",
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
  output_dir: "",
  output_name: "",
  logging_dir: "",
  seed: 42,
};

const DEFAULT_LOW_ARGS: TrainingArgs = {
  ...DEFAULT_HIGH_ARGS,
  min_timestep: 0,
  max_timestep: 900,
  learning_rate: 1e-4,
};

const DEFAULT_SAMPLE_CONFIG: SampleConfig = {
  enabled: false,
  image_path: "",
  prompt: "",
};

const JOB_TYPE_SETTINGS: Record<string, Partial<TrainingArgs>> = {
  high_noise: {
    min_timestep: 900,
    max_timestep: 1000,
    learning_rate: 2e-4,
  },
  low_noise: {
    min_timestep: 0,
    max_timestep: 900,
    learning_rate: 1e-4,
  },
};

const ACTIVE_STATUSES = ["caching_latents", "caching_text", "training"];

export function NewJobPage() {
  const navigate = useNavigate();
  const { data: settings } = useSWR<Settings>("/settings", fetcher);
  const { data: datasetsResponse } = useSWR<PaginatedResponse<DatasetInfo>>("/datasets", fetcher);
  const datasets = datasetsResponse?.items;
  const { jobs } = useJobs();
  const [datasetCfg, setDatasetCfg] = useState<DatasetConfig>(DEFAULT_DATASET);
  const [trainingArgs, setTrainingArgs] = useState<TrainingArgs>(DEFAULT_HIGH_ARGS);
  const [lowArgs, setLowArgs] = useState<TrainingArgs>(DEFAULT_LOW_ARGS);
  const [sampleConfig, setSampleConfig] = useState<SampleConfig>(DEFAULT_SAMPLE_CONFIG);
  const [tomlPreview, setTomlPreview] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [jobName, setJobName] = useState("");
  const [jobType, setJobType] = useState("high_noise");
  const [selectedDataset, setSelectedDataset] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isInterleaved = jobType === "interleaved";
  const hasRunningJob = jobs.some((j) => ACTIVE_STATUSES.includes(j.status));

  // Auto-fill paths from settings
  useEffect(() => {
    if (settings) {
      const comfy = settings.comfyui_models_path;
      if (comfy) {
        setTrainingArgs((prev) => ({
          ...prev,
          vae_path: prev.vae_path || `${comfy}/diffusion_models/Wan2.1_VAE.pth`,
          t5_path: prev.t5_path || `${comfy}/text_encoders/models_t5_umt5-xxl-enc-bf16.pth`,
          dit_path:
            prev.dit_path ||
            `${comfy}/diffusion_models/wan2.2_i2v_high_noise_14B_fp16.safetensors`,
        }));
        setLowArgs((prev) => ({
          ...prev,
          vae_path: prev.vae_path || `${comfy}/diffusion_models/Wan2.1_VAE.pth`,
          t5_path: prev.t5_path || `${comfy}/text_encoders/models_t5_umt5-xxl-enc-bf16.pth`,
          dit_path:
            prev.dit_path ||
            `${comfy}/diffusion_models/wan2.2_i2v_low_noise_14B_fp16.safetensors`,
        }));
      }
      setTrainingArgs((prev) => ({
        ...prev,
        output_dir: prev.output_dir || settings.default_output_dir,
        logging_dir: prev.logging_dir || (settings.default_output_dir ? settings.default_output_dir + "/logs" : ""),
      }));
      setLowArgs((prev) => ({
        ...prev,
        output_dir: prev.output_dir || settings.default_output_dir,
        logging_dir: prev.logging_dir || (settings.default_output_dir ? settings.default_output_dir + "/logs" : ""),
      }));
    }
  }, [settings]);

  // Auto-select first dataset if none selected
  useEffect(() => {
    if (!selectedDataset && datasets && datasets.length > 0) {
      setSelectedDataset(datasets[0].name);
    }
  }, [datasets, selectedDataset]);

  // When dataset selection changes, auto-fill video/cache dirs
  useEffect(() => {
    if (selectedDataset && settings?.default_dataset_dir) {
      const base = settings.default_dataset_dir.replace(/\/+$/, "");
      setDatasetCfg((prev) => ({
        ...prev,
        video_directory: `${base}/${selectedDataset}`,
        cache_directory: `${base}/${selectedDataset}/cache`,
      }));
    }
  }, [selectedDataset, settings]);

  const handleJobTypeChange = (newType: string) => {
    setJobType(newType);
    if (newType === "interleaved") {
      // Set high noise defaults
      const comfy = settings?.comfyui_models_path;
      if (comfy) {
        setTrainingArgs((prev) => ({
          ...prev,
          dit_path: `${comfy}/diffusion_models/wan2.2_i2v_high_noise_14B_fp16.safetensors`,
          min_timestep: 900,
          max_timestep: 1000,
          learning_rate: 2e-4,
        }));
        setLowArgs((prev) => ({
          ...prev,
          dit_path: `${comfy}/diffusion_models/wan2.2_i2v_low_noise_14B_fp16.safetensors`,
          min_timestep: 0,
          max_timestep: 900,
          learning_rate: 1e-4,
        }));
      }
    } else {
      const overrides = JOB_TYPE_SETTINGS[newType];
      if (overrides) {
        setTrainingArgs((prev) => ({ ...prev, ...overrides }));
        const comfy = settings?.comfyui_models_path;
        if (comfy) {
          const isHigh = newType === "high_noise";
          setTrainingArgs((prev) => ({
            ...prev,
            dit_path: `${comfy}/diffusion_models/wan2.2_i2v_${isHigh ? "high" : "low"}_noise_14B_fp16.safetensors`,
          }));
        }
      }
    }
  };

  // Sync shared fields from high to low when in interleaved mode
  const handleHighArgsChange = (args: TrainingArgs) => {
    setTrainingArgs(args);
    if (isInterleaved) {
      // Sync shared fields to low args
      setLowArgs((prev) => ({
        ...prev,
        vae_path: args.vae_path,
        t5_path: args.t5_path,
        network_dim: args.network_dim,
        network_alpha: args.network_alpha,
        loraplus_lr_ratio: args.loraplus_lr_ratio,
        optimizer_type: args.optimizer_type,
        lr_scheduler: args.lr_scheduler,
        max_train_epochs: args.max_train_epochs,
        save_every_n_epochs: args.save_every_n_epochs,
        mixed_precision: args.mixed_precision,
        fp8_base: args.fp8_base,
        fp8_scaled: args.fp8_scaled,
        gradient_checkpointing: args.gradient_checkpointing,
        output_dir: args.output_dir,
        logging_dir: args.logging_dir,
        seed: args.seed,
      }));
    }
  };

  const generateToml = async () => {
    const res = await api.post<{ toml: string }>("/configs/generate-toml", {
      dataset_config: datasetCfg,
      training_args: trainingArgs,
    });
    setTomlPreview(res.toml);
  };

  const validate = async () => {
    const res = await api.post<{ valid: boolean; errors: string[] }>("/configs/validate", {
      dataset_config: datasetCfg,
      training_args: trainingArgs,
    });
    setErrors(res.errors);
    return res.valid;
  };

  const createJob = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const valid = await validate();
      if (!valid) {
        setSubmitting(false);
        return;
      }
      const payload: Record<string, unknown> = {
        name: jobName || `${jobType} training`,
        job_type: jobType,
        dataset_config: datasetCfg,
        training_args: trainingArgs,
        dataset_name: selectedDataset || null,
      };
      if (isInterleaved) {
        payload.training_args_low = lowArgs;
        payload.sample_config = sampleConfig;
      }
      const job = await api.post<Job>("/jobs", payload);
      navigate(`/jobs/${job.id}`);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">New Job</h2>

      <div className="mb-6 bg-surface-2 rounded-lg border border-border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs text-text-dim mb-1">Job Name</label>
            <input
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="e.g. hardcut_high_v1"
              className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-text-dim mb-1">Job Type</label>
            <select
              value={jobType}
              onChange={(e) => handleJobTypeChange(e.target.value)}
              className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
            >
              <option value="high_noise">High Noise (900-1000)</option>
              <option value="low_noise">Low Noise (0-900)</option>
              <option value="interleaved">Interleaved (High + Low + Sampling)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-dim mb-1">Dataset</label>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
            >
              <option value="">Manual paths</option>
              {datasets?.map((ds) => (
                <option key={ds.id} value={ds.name}>
                  {ds.name} ({ds.video_count} videos)
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={generateToml}
              className="px-3 py-1.5 text-sm bg-surface-3 border border-border rounded hover:border-accent/50 transition-colors"
            >
              Preview TOML
            </button>
            <button
              onClick={validate}
              className="px-3 py-1.5 text-sm bg-surface-3 border border-border rounded hover:border-accent/50 transition-colors"
            >
              Validate
            </button>
          </div>
        </div>
        <button
          onClick={createJob}
          disabled={submitting}
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {submitting ? "Submitting..." : hasRunningJob ? "Add to Queue" : "Create & Start Job"}
        </button>
        {submitError && (
          <p className="mt-2 text-sm text-error">{submitError}</p>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-4 bg-error/10 border border-error/30 rounded p-3">
          <p className="text-sm font-medium text-error mb-1">Validation Errors:</p>
          <ul className="text-sm text-error list-disc list-inside">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {isInterleaved && (
        <p className="mb-4 text-sm text-text-dim bg-surface-2 border border-border rounded p-3">
          Interleaved training alternates high and low noise epochs, generating a sample video after each cycle.
          Shared settings (LoRA, optimizer, memory, output) are synced from the High Noise form.
        </p>
      )}

      <div className="space-y-6">
        <DatasetTomlForm config={datasetCfg} onChange={setDatasetCfg} datasetSelected={!!selectedDataset} />

        {isInterleaved ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-accent mb-2">High Noise (900-1000)</h3>
                <TrainingArgsForm args={trainingArgs} onChange={handleHighArgsChange} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-accent mb-2">Low Noise (0-900)</h3>
                <TrainingArgsForm args={lowArgs} onChange={setLowArgs} />
              </div>
            </div>
            <SampleConfigForm config={sampleConfig} onChange={setSampleConfig} />
          </>
        ) : (
          <TrainingArgsForm args={trainingArgs} onChange={handleHighArgsChange} />
        )}
      </div>

      {/* TOML preview */}
      {tomlPreview && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-text-dim mb-2">Dataset TOML Preview</h3>
          <pre className="bg-surface-2 border border-border rounded p-3 text-xs overflow-x-auto">
            {tomlPreview}
          </pre>
        </div>
      )}
    </div>
  );
}

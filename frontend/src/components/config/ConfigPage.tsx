import { useEffect, useState } from "react";
import useSWR from "swr";
import { api, fetcher } from "../../api/client";
import type { DatasetConfig, DatasetInfo, Settings, TrainingArgs } from "../../api/types";
import { useJobs } from "../../hooks/useJobs";
import { DatasetTomlForm } from "./DatasetTomlForm";
import { TrainingArgsForm } from "./TrainingArgsForm";

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

const DEFAULT_ARGS: TrainingArgs = {
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

// Settings driven by job type
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

export function ConfigPage() {
  const { data: settings } = useSWR<Settings>("/settings", fetcher);
  const { data: datasets } = useSWR<DatasetInfo[]>("/datasets", fetcher);
  const { jobs } = useJobs();
  const [datasetCfg, setDatasetCfg] = useState<DatasetConfig>(DEFAULT_DATASET);
  const [trainingArgs, setTrainingArgs] = useState<TrainingArgs>(DEFAULT_ARGS);
  const [tomlPreview, setTomlPreview] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [jobName, setJobName] = useState("");
  const [jobType, setJobType] = useState("high_noise");
  const [selectedDataset, setSelectedDataset] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);

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
      }
      setTrainingArgs((prev) => ({
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

  // Update args when job type changes
  const handleJobTypeChange = (newType: string) => {
    setJobType(newType);
    const overrides = JOB_TYPE_SETTINGS[newType];
    if (overrides) {
      setTrainingArgs((prev) => ({ ...prev, ...overrides }));
      // Auto-switch DiT path
      const comfy = settings?.comfyui_models_path;
      if (comfy) {
        const isHigh = newType === "high_noise";
        setTrainingArgs((prev) => ({
          ...prev,
          dit_path: `${comfy}/diffusion_models/wan2.2_i2v_${isHigh ? "high" : "low"}_noise_14B_fp16.safetensors`,
        }));
      }
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
    setSubmitResult(null);
    try {
      const valid = await validate();
      if (!valid) {
        setSubmitting(false);
        return;
      }
      await api.post("/jobs", {
        name: jobName || `${jobType} training`,
        job_type: jobType,
        dataset_config: datasetCfg,
        training_args: trainingArgs,
        dataset_name: selectedDataset || null,
      });
      setSubmitResult(hasRunningJob ? "Job added to queue!" : "Job created and started!");
    } catch (e: unknown) {
      setSubmitResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Training Config</h2>

      {/* Job creation — top of page */}
      <div className="mb-6 bg-surface-2 rounded-lg border border-border p-4">
        <h3 className="font-medium text-sm mb-3">Create Job</h3>
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
              <option value="both">Both (sequential)</option>
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
        {submitResult && (
          <p className={`mt-2 text-sm ${submitResult.startsWith("Error") ? "text-error" : "text-success"}`}>
            {submitResult}
          </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DatasetTomlForm config={datasetCfg} onChange={setDatasetCfg} datasetSelected={!!selectedDataset} />
        <TrainingArgsForm args={trainingArgs} onChange={setTrainingArgs} />
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

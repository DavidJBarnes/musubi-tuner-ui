import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import type { Job } from "../../api/types";

export function AdoptJobForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [jobType, setJobType] = useState("high_noise");
  const [logFile, setLogFile] = useState("");
  const [tbDir, setTbDir] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const job = await api.post<Job>("/jobs/adopt", {
        name,
        job_type: jobType,
        log_file: logFile,
        tensorboard_dir: tbDir,
        output_dir: outputDir,
      });
      onDone();
      navigate(`/jobs/${job.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-surface-2 rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-sm font-medium">Adopt Existing Job</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-text-dim">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. High Noise Run 1"
            className="mt-1 block w-full bg-surface rounded border border-border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-text-dim">Job Type</span>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="mt-1 block w-full bg-surface rounded border border-border px-2 py-1.5 text-sm"
          >
            <option value="high_noise">High Noise</option>
            <option value="low_noise">Low Noise</option>
            <option value="both">Both</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-text-dim">Log File Path</span>
        <input
          value={logFile}
          onChange={(e) => setLogFile(e.target.value)}
          required
          placeholder="/home/david/projects/lora-hardcut/logs/separate.log"
          className="mt-1 block w-full bg-surface rounded border border-border px-2 py-1.5 text-sm font-mono"
        />
      </label>
      <label className="block">
        <span className="text-xs text-text-dim">TensorBoard Directory</span>
        <input
          value={tbDir}
          onChange={(e) => setTbDir(e.target.value)}
          required
          placeholder="/home/david/projects/lora-hardcut/logs"
          className="mt-1 block w-full bg-surface rounded border border-border px-2 py-1.5 text-sm font-mono"
        />
      </label>
      <label className="block">
        <span className="text-xs text-text-dim">Output Directory (optional)</span>
        <input
          value={outputDir}
          onChange={(e) => setOutputDir(e.target.value)}
          placeholder="/home/david/projects/lora-hardcut/output/high_noise"
          className="mt-1 block w-full bg-surface rounded border border-border px-2 py-1.5 text-sm font-mono"
        />
      </label>
      {error && <p className="text-xs text-error">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-3 py-1.5 text-sm bg-accent rounded hover:bg-accent/80 transition-colors disabled:opacity-50"
        >
          {submitting ? "Adopting..." : "Adopt Job"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-1.5 text-sm text-text-dim border border-border rounded hover:bg-surface transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useJob } from "../../hooks/useJobs";
import { LossChart } from "./LossChart";
import { LogViewer } from "./LogViewer";
import { ProgressBar } from "./ProgressBar";

const ACTIVE = ["caching_latents", "caching_text", "training", "pending"];

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { job, mutate } = useJob(id);

  if (!job) return <p className="text-text-dim">Loading...</p>;

  const isActive = ACTIVE.includes(job.status);

  const cancel = async () => {
    if (!confirm("Cancel this job?")) return;
    await api.del(`/jobs/${job.id}`);
    mutate();
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold">{job.name}</h2>
          <p className="text-sm text-text-dim">
            {job.job_type.replace(/_/g, " ")} &middot; {job.status.replace(/_/g, " ")}
          </p>
        </div>
        {isActive && (
          <button
            onClick={cancel}
            className="px-3 py-1.5 text-sm text-error border border-error/30 rounded hover:bg-error/10 transition-colors"
          >
            Cancel Job
          </button>
        )}
      </div>

      <div className="space-y-4">
        <ProgressBar
          current={job.progress_current}
          total={job.progress_total}
          phase={job.current_phase}
          status={job.status}
        />

        {id && <LogViewer jobId={id} />}

        {(job.status === "training" || job.status === "completed") && id && (
          <LossChart jobId={id} />
        )}

        {job.error_message && (
          <div className="bg-error/10 border border-error/30 rounded p-3">
            <p className="text-sm text-error">{job.error_message}</p>
          </div>
        )}

        <div className="bg-surface-2 rounded-lg border border-border p-4 text-xs text-text-dim space-y-1">
          <p>Created: {new Date(job.created_at).toLocaleString()}</p>
          {job.started_at && <p>Started: {new Date(job.started_at).toLocaleString()}</p>}
          {job.completed_at && <p>Completed: {new Date(job.completed_at).toLocaleString()}</p>}
          {job.output_dir && <p>Output: {job.output_dir}</p>}
        </div>
      </div>
    </div>
  );
}

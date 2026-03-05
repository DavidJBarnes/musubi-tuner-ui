import { useParams } from "react-router-dom";
import useSWR from "swr";
import { api, fetcher } from "../../api/client";
import type { JobStats } from "../../api/types";
import { useJob } from "../../hooks/useJobs";
import { Checkpoints } from "./Checkpoints";
import { LossChart } from "./LossChart";
import { LogViewer } from "./LogViewer";
import { ProgressBar } from "./ProgressBar";

const ACTIVE = ["caching_latents", "caching_text", "training", "pending"];

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { job, mutate } = useJob(id);
  const { data: stats } = useSWR<JobStats>(
    id ? `/jobs/${id}/stats` : null,
    fetcher,
    { refreshInterval: 5000 },
  );

  if (!job) return <p className="text-text-dim">Loading...</p>;

  const isActive = ACTIVE.includes(job.status);

  const cancel = async () => {
    if (!confirm("Cancel this job?")) return;
    await api.del(`/jobs/${job.id}`);
    mutate();
  };

  const retry = async () => {
    await api.post(`/jobs/${job.id}/retry`, {});
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
        <div className="flex gap-2">
          {isActive && (
            <button
              onClick={cancel}
              className="px-3 py-1.5 text-sm text-error border border-error/30 rounded hover:bg-error/10 transition-colors"
            >
              Cancel Job
            </button>
          )}
          {(job.status === "failed" || job.status === "cancelled") && (
            <button
              onClick={retry}
              className="px-3 py-1.5 text-sm text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors"
            >
              Retry Job
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <ProgressBar
          current={stats?.current ?? job.progress_current}
          total={stats?.total ?? job.progress_total}
          phase={job.current_phase}
          status={job.status}
          speed={stats?.speed ?? null}
          epoch={stats?.epoch ?? 0}
          totalEpochs={stats?.total_epochs ?? 0}
          saveEveryNEpochs={stats?.save_every_n_epochs ?? 1}
        />

        {/* Logs + Checkpoints side by side */}
        {id && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <LogViewer jobId={id} />
            </div>
            <div>
              <Checkpoints jobId={id} />
            </div>
          </div>
        )}

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

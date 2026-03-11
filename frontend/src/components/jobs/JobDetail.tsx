import { useParams } from "react-router-dom";
import useSWR from "swr";
import { api, fetcher } from "../../api/client";
import type { JobStats } from "../../api/types";
import { useJob } from "../../hooks/useJobs";
import { formatDateTime, utcToLocal } from "../../utils/date";
import { Checkpoints } from "./Checkpoints";
import { LossChart } from "./LossChart";
import { LogViewer } from "./LogViewer";
import { ProgressBar } from "./ProgressBar";
import { Samples } from "./Samples";

const ACTIVE = ["caching_latents", "caching_text", "training", "pending", "queued"];

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
    if (!confirm("Cancel this job? This is permanent — you won't be able to resume.")) return;
    await api.del(`/jobs/${job.id}`);
    mutate();
  };

  const retry = async () => {
    await api.post(`/jobs/${job.id}/retry`, {});
    mutate();
  };

  const stop = async () => {
    if (!confirm("Stop this job? You can resume it later from the last checkpoint.")) return;
    await api.post(`/jobs/${job.id}/stop`, {});
    mutate();
  };

  const resume = async () => {
    await api.post(`/jobs/${job.id}/resume`, {});
    mutate();
  };

  const isRunning = ["caching_latents", "caching_text", "training"].includes(job.status);
  const isInterleaved = job.job_type === "interleaved";

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold">{job.name}</h2>
          <p className="text-sm text-text-dim">
            {job.job_type.replace(/_/g, " ")} &middot; {job.status.replace(/_/g, " ")}
            {job.dataset_name && <> &middot; {job.dataset_name}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <>
              <button
                onClick={stop}
                className="px-3 py-1.5 text-sm text-error border border-error/30 rounded hover:bg-error/10 transition-colors"
              >
                Stop Job
              </button>
              <button
                onClick={cancel}
                className="text-xs text-text-dim hover:text-error transition-colors"
              >
                Cancel
              </button>
            </>
          )}
          {job.status === "stopped" && (
            <>
              <button
                onClick={resume}
                className="px-3 py-1.5 text-sm text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors"
              >
                Resume Job
              </button>
              <button
                onClick={cancel}
                className="text-xs text-text-dim hover:text-error transition-colors"
              >
                Cancel
              </button>
            </>
          )}
          {job.status === "failed" && (
            <>
              <button
                onClick={resume}
                className="px-3 py-1.5 text-sm text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors"
              >
                Resume Job
              </button>
              <button
                onClick={retry}
                className="px-3 py-1.5 text-sm text-text-dim border border-border rounded hover:bg-surface-2 transition-colors"
              >
                Retry Job
              </button>
            </>
          )}
          {job.status === "cancelled" && (
            <button
              onClick={retry}
              className="px-3 py-1.5 text-sm text-text-dim border border-border rounded hover:bg-surface-2 transition-colors"
            >
              Retry Job
            </button>
          )}
          {(isActive && !isRunning) && (
            <button
              onClick={cancel}
              className="px-3 py-1.5 text-sm text-error border border-error/30 rounded hover:bg-error/10 transition-colors"
            >
              Cancel Job
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
          avrLoss={stats?.avr_loss ?? null}
          interleavedCycle={stats?.interleaved_cycle ?? job.interleaved_cycle}
          interleavedPhase={stats?.interleaved_phase ?? job.interleaved_phase}
          interleavedTotalCycles={stats?.interleaved_total_cycles ?? job.interleaved_total_cycles}
        />

        {/* Samples section for interleaved jobs */}
        {isInterleaved && id && <Samples jobId={id} />}

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
          <p>Created: {formatDateTime(job.created_at)}</p>
          {job.started_at && <p>Started: {formatDateTime(job.started_at)}</p>}
          {job.completed_at && <p>Completed: {formatDateTime(job.completed_at)}</p>}
          {job.started_at && (
            <p>Duration: {(() => {
              const start = utcToLocal(job.started_at).getTime();
              const end = job.completed_at ? utcToLocal(job.completed_at).getTime() : Date.now();
              const mins = Math.floor((end - start) / 60000);
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              return h > 0 ? `${h}h ${m}m` : `${m}m`;
            })()}</p>
          )}
          {job.output_dir && <p>Output: {job.output_dir}</p>}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useJobs } from "../../hooks/useJobs";
import { AdoptJobForm } from "./AdoptJobForm";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-500",
  queued: "bg-gray-400",
  caching_latents: "bg-warning",
  caching_text: "bg-warning",
  training: "bg-accent",
  completed: "bg-success",
  failed: "bg-error",
  cancelled: "bg-gray-500",
};

const RUNNING_STATUSES = ["caching_latents", "caching_text", "training", "pending"];

export function JobsPage() {
  const { jobs, mutate } = useJobs();
  const [showAdopt, setShowAdopt] = useState(false);

  const running = jobs.filter((j) => RUNNING_STATUSES.includes(j.status));
  const queued = jobs
    .filter((j) => j.status === "queued")
    .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0));
  const history = jobs.filter(
    (j) => !RUNNING_STATUSES.includes(j.status) && j.status !== "queued",
  );

  const removeFromQueue = async (id: string) => {
    await api.del(`/jobs/${id}`);
    mutate();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Jobs</h2>
        <button
          onClick={() => setShowAdopt(!showAdopt)}
          className="px-3 py-1.5 text-sm border border-border rounded hover:bg-surface-2 transition-colors"
        >
          {showAdopt ? "Close" : "Adopt Existing Job"}
        </button>
      </div>

      {showAdopt && (
        <div className="mb-4">
          <AdoptJobForm onDone={() => { setShowAdopt(false); mutate(); }} />
        </div>
      )}

      {/* Running */}
      {running.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-text-dim mb-2">Running</h3>
          <div className="space-y-2">
            {running.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Queue */}
      {queued.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-text-dim mb-2">Queue ({queued.length})</h3>
          <div className="space-y-2">
            {queued.map((job) => (
              <div key={job.id} className="flex items-center gap-2">
                <Link
                  to={`/jobs/${job.id}`}
                  className="flex-1 block bg-surface-2 rounded-lg border border-border p-4 hover:border-accent/50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${STATUS_COLORS.queued}`} />
                      <div>
                        <p className="font-medium text-sm">{job.name}</p>
                        <p className="text-xs text-text-dim">
                          {job.job_type.replace(/_/g, " ")}
                          {job.dataset_name && <> &middot; {job.dataset_name}</>}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-text-dim">#{job.queue_position}</p>
                  </div>
                </Link>
                <button
                  onClick={() => removeFromQueue(job.id)}
                  className="px-2 py-1 text-xs text-error border border-error/30 rounded hover:bg-error/10 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-dim mb-2">History</h3>
          <div className="space-y-2">
            {history.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {jobs.length === 0 && (
        <p className="text-text-dim text-sm">No jobs yet.</p>
      )}
    </div>
  );
}

function JobRow({ job }: { job: { id: string; name: string; status: string; job_type: string; created_at: string; progress_current: number; progress_total: number; dataset_name: string | null } }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block bg-surface-2 rounded-lg border border-border p-4 hover:border-accent/50 transition-colors"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[job.status] ?? "bg-gray-500"}`} />
          <div>
            <p className="font-medium text-sm">{job.name}</p>
            <p className="text-xs text-text-dim">
              {job.job_type.replace(/_/g, " ")}
              {job.dataset_name && <> &middot; {job.dataset_name}</>}
              {" "}&middot; {new Date(job.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-dim">{job.status.replace(/_/g, " ")}</p>
          {job.progress_total > 0 && (
            <p className="text-xs text-text-dim">
              {job.progress_current}/{job.progress_total}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

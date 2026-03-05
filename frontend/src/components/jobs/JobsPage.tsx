import { useState } from "react";
import { Link } from "react-router-dom";
import { useJobs } from "../../hooks/useJobs";
import { AdoptJobForm } from "./AdoptJobForm";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-500",
  caching_latents: "bg-warning",
  caching_text: "bg-warning",
  training: "bg-accent",
  completed: "bg-success",
  failed: "bg-error",
  cancelled: "bg-gray-500",
};

export function JobsPage() {
  const { jobs, mutate } = useJobs();
  const [showAdopt, setShowAdopt] = useState(false);

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

      {jobs.length === 0 ? (
        <p className="text-text-dim text-sm">No jobs yet.</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="block bg-surface-2 rounded-lg border border-border p-4 hover:border-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[job.status] ?? "bg-gray-500"}`} />
                  <div>
                    <p className="font-medium text-sm">{job.name}</p>
                    <p className="text-xs text-text-dim">
                      {job.job_type.replace(/_/g, " ")} &middot;{" "}
                      {new Date(job.created_at).toLocaleDateString()}
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
          ))}
        </div>
      )}
    </div>
  );
}

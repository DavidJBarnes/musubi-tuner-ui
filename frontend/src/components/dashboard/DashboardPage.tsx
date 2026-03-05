import { Link } from "react-router-dom";
import { useJobs } from "../../hooks/useJobs";
import { ActiveJobCard } from "./ActiveJobCard";
import { GpuWidget } from "./GpuWidget";

const ACTIVE_STATUSES = ["caching_latents", "caching_text", "training", "pending"];

export function DashboardPage() {
  const { jobs } = useJobs();
  const activeJobs = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  const queuedJobs = jobs.filter((j) => j.status === "queued");
  const recentJobs = jobs.filter((j) => !ACTIVE_STATUSES.includes(j.status) && j.status !== "queued").slice(0, 5);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <GpuWidget />
      </div>

      {activeJobs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-text-dim mb-3">Active Jobs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeJobs.map((j) => (
              <ActiveJobCard key={j.id} job={j} />
            ))}
          </div>
        </div>
      )}

      {queuedJobs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-text-dim mb-3">
            Queue ({queuedJobs.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {queuedJobs.map((j) => (
              <Link
                key={j.id}
                to={`/jobs/${j.id}`}
                className="block bg-surface-2 rounded-lg border border-border p-3 hover:border-accent/50 transition-colors"
              >
                <p className="text-sm font-medium">{j.name}</p>
                <p className="text-xs text-text-dim">
                  {j.job_type.replace(/_/g, " ")}
                  {j.dataset_name && <> &middot; {j.dataset_name}</>}
                  {" "}&middot; #{j.queue_position}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recentJobs.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-dim mb-3">Recent Jobs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentJobs.map((j) => (
              <ActiveJobCard key={j.id} job={j} />
            ))}
          </div>
        </div>
      )}

      {jobs.length === 0 && (
        <p className="text-text-dim text-sm">No jobs yet. <a href="/jobs/new" className="text-accent hover:underline">Create one</a>.</p>
      )}
    </div>
  );
}

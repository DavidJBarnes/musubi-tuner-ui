import { useJobs } from "../../hooks/useJobs";
import { ActiveJobCard } from "./ActiveJobCard";
import { GpuWidget } from "./GpuWidget";

const ACTIVE_STATUSES = ["caching_latents", "caching_text", "training", "pending"];

export function DashboardPage() {
  const { jobs } = useJobs();
  const activeJobs = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  const recentJobs = jobs.filter((j) => !ACTIVE_STATUSES.includes(j.status)).slice(0, 5);

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
        <p className="text-text-dim text-sm">No jobs yet. Create one from the Config page.</p>
      )}
    </div>
  );
}

import { Link } from "react-router-dom";
import type { Job } from "../../api/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-text-dim",
  caching_latents: "text-warning",
  caching_text: "text-warning",
  training: "text-accent",
  completed: "text-success",
  failed: "text-error",
  cancelled: "text-text-dim",
};

export function ActiveJobCard({ job }: { job: Job }) {
  const pct =
    job.progress_total > 0
      ? Math.round((job.progress_current / job.progress_total) * 100)
      : 0;

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block bg-surface-2 rounded-lg p-4 border border-border hover:border-accent/50 transition-colors"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-sm">{job.name}</h4>
        <span className={`text-xs font-medium ${STATUS_COLORS[job.status] ?? "text-text-dim"}`}>
          {job.status.replace(/_/g, " ")}
        </span>
      </div>
      {job.current_phase && (
        <p className="text-xs text-text-dim mb-2">Phase: {job.current_phase.replace(/_/g, " ")}</p>
      )}
      {job.progress_total > 0 && (
        <div>
          <div className="flex justify-between text-xs text-text-dim mb-1">
            <span>
              {job.progress_current} / {job.progress_total}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}

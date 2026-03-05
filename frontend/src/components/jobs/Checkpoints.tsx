import useSWR from "swr";
import { fetcher } from "../../api/client";

interface Checkpoint {
  filename: string;
  path: string;
  size_bytes: number;
  modified: number;
}

interface Props {
  jobId: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Checkpoints({ jobId }: Props) {
  const { data: checkpoints } = useSWR<Checkpoint[]>(
    `/jobs/${jobId}/checkpoints`,
    fetcher,
    { refreshInterval: 30000 },
  );

  return (
    <div className="bg-surface-2 rounded-lg border border-border overflow-hidden h-full flex flex-col">
      <div className="flex justify-between items-center px-3 py-2 bg-surface-2 border-b border-border">
        <span className="text-xs text-text-dim">Checkpoints</span>
        {checkpoints && checkpoints.length > 0 && (
          <span className="text-xs text-text-dim">{checkpoints.length} saved</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {(!checkpoints || checkpoints.length === 0) ? (
          <p className="text-xs text-text-dim">No checkpoints yet</p>
        ) : (
          checkpoints.map((cp) => (
            <a
              key={cp.filename}
              href={`/api/jobs/${jobId}/checkpoints/${cp.filename}`}
              download
              className="block bg-surface rounded border border-border p-2 hover:border-accent/50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <p className="text-xs font-medium text-text truncate mr-2">{cp.filename}</p>
                <svg className="w-3.5 h-3.5 text-text-dim flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <p className="text-xs text-text-dim mt-1">
                {formatSize(cp.size_bytes)} &middot; {formatTime(cp.modified)}
              </p>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

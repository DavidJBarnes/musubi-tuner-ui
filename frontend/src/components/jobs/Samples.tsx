import useSWR from "swr";
import { fetcher } from "../../api/client";
import type { SampleInfo } from "../../api/types";

interface Props {
  jobId: string;
}

export function Samples({ jobId }: Props) {
  const { data: samples } = useSWR<SampleInfo[]>(
    `/jobs/${jobId}/samples`,
    fetcher,
    { refreshInterval: 10000 },
  );

  if (!samples || samples.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface-2 rounded-lg border border-border p-4">
      <h3 className="text-sm font-medium mb-3">Samples</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {samples.map((sample) => (
          <div
            key={sample.id}
            className="bg-surface rounded-lg border border-border overflow-hidden"
          >
            {sample.status === "completed" ? (
              <video
                controls
                className="w-full aspect-video bg-black"
                src={`/api/jobs/${jobId}/samples/${sample.id}/video`}
              />
            ) : sample.status === "generating" ? (
              <div className="w-full aspect-video bg-surface-3 flex items-center justify-center">
                <div className="text-sm text-text-dim animate-pulse">Generating...</div>
              </div>
            ) : (
              <div className="w-full aspect-video bg-error/5 flex items-center justify-center p-3">
                <p className="text-xs text-error text-center">{sample.error_message || "Failed"}</p>
              </div>
            )}
            <div className="p-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Cycle {sample.cycle}</span>
                {sample.duration_seconds != null && (
                  <span className="text-xs text-text-dim">
                    {Math.floor(sample.duration_seconds / 60)}m {Math.floor(sample.duration_seconds % 60)}s
                  </span>
                )}
              </div>
              <p className="text-xs text-text-dim mt-1 truncate" title={sample.high_checkpoint}>
                H: {sample.high_checkpoint}
              </p>
              <p className="text-xs text-text-dim truncate" title={sample.low_checkpoint}>
                L: {sample.low_checkpoint}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

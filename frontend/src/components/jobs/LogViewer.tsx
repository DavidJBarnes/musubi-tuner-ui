import { useEffect, useRef } from "react";
import { useSSE } from "../../hooks/useSSE";

interface Props {
  jobId: string;
}

export function LogViewer({ jobId }: Props) {
  const { lines, done } = useSSE(`/api/jobs/${jobId}/logs`);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="bg-[#0d1117] rounded-lg border border-border overflow-hidden">
      <div className="flex justify-between items-center px-3 py-2 bg-surface-2 border-b border-border">
        <span className="text-xs text-text-dim">Logs</span>
        {done && <span className="text-xs text-success">Stream ended</span>}
        {!done && lines.length > 0 && (
          <span className="text-xs text-accent animate-pulse">Live</span>
        )}
      </div>
      <div className="h-96 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
        {lines.map((line, i) => (
          <div key={i} className="text-gray-300 hover:bg-white/5">
            {line}
          </div>
        ))}
        {lines.length === 0 && (
          <div className="text-text-dim">Waiting for log output...</div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

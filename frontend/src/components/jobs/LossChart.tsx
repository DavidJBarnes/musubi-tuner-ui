import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";
import { fetcher } from "../../api/client";
import type { LossPoint } from "../../api/types";

interface Props {
  jobId: string;
}

export function LossChart({ jobId }: Props) {
  const { data: points } = useSWR<LossPoint[]>(`/jobs/${jobId}/loss`, fetcher, {
    refreshInterval: 10000,
  });

  if (!points || points.length === 0) {
    return (
      <div className="bg-surface-2 rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium text-text-dim mb-2">Loss Curve</h3>
        <p className="text-xs text-text-dim">No loss data available yet</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-2 rounded-lg border border-border p-4">
      <h3 className="text-sm font-medium text-text-dim mb-3">Loss Curve</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={points}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
          <XAxis dataKey="step" tick={{ fontSize: 11, fill: "#999" }} />
          <YAxis tick={{ fontSize: 11, fill: "#999" }} />
          <Tooltip
            contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 6 }}
            labelStyle={{ color: "#999" }}
            itemStyle={{ color: "#e94560" }}
          />
          <Line type="monotone" dataKey="value" stroke="#e94560" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

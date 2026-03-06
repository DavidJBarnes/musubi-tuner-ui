import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";
import { fetcher } from "../../api/client";
import type { LossPoint } from "../../api/types";

interface Props {
  jobId: string;
}

export function computeTrendLine(points: LossPoint[]): LossPoint[] {
  if (points.length < 2) return [];

  // Simple linear regression
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of points) {
    sumX += p.step;
    sumY += p.value;
    sumXY += p.step * p.value;
    sumXX += p.step * p.step;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Return trend at first and last point
  return [
    { step: points[0].step, value: slope * points[0].step + intercept },
    { step: points[n - 1].step, value: slope * points[n - 1].step + intercept },
  ];
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

  const trend = computeTrendLine(points);

  // Merge loss and trend into one dataset for recharts
  const merged = points.map((p) => ({ step: p.step, loss: p.value, trend: undefined as number | undefined }));
  if (trend.length === 2) {
    // Add trend values only at first and last data points
    merged[0] = { ...merged[0], trend: trend[0].value };
    merged[merged.length - 1] = { ...merged[merged.length - 1], trend: trend[1].value };
  }

  // Compute average loss of last 10 points for display
  const recentPoints = points.slice(-10);
  const avgLoss = recentPoints.reduce((s, p) => s + p.value, 0) / recentPoints.length;

  return (
    <div className="bg-surface-2 rounded-lg border border-border p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-text-dim">Loss Curve</h3>
        <span className="text-xs text-text-dim">
          Avg (last {recentPoints.length}): {avgLoss.toFixed(4)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
          <XAxis dataKey="step" tick={{ fontSize: 11, fill: "#999" }} />
          <YAxis tick={{ fontSize: 11, fill: "#999" }} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 6 }}
            labelStyle={{ color: "#999" }}
          />
          <Line
            type="monotone"
            dataKey="loss"
            stroke="#e94560"
            strokeWidth={1.5}
            dot={false}
            name="Loss"
          />
          <Line
            type="linear"
            dataKey="trend"
            stroke="#4ecdc4"
            strokeWidth={1}
            strokeDasharray="6 3"
            dot={false}
            connectNulls
            name="Trend"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

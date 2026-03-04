import { useGpuStatus } from "../../hooks/useGpuStatus";

export function GpuWidget() {
  const { gpu } = useGpuStatus();

  if (!gpu?.available) {
    return (
      <div className="bg-surface-2 rounded-lg p-4 border border-border">
        <h3 className="text-sm font-medium text-text-dim mb-2">GPU Status</h3>
        <p className="text-text-dim text-sm">No GPU detected</p>
      </div>
    );
  }

  const vramPct = Math.round((gpu.vram_used_mb / gpu.vram_total_mb) * 100);

  return (
    <div className="bg-surface-2 rounded-lg p-4 border border-border">
      <h3 className="text-sm font-medium text-text-dim mb-3">GPU Status</h3>
      <p className="font-medium mb-3">{gpu.name}</p>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-text-dim mb-1">
            <span>VRAM</span>
            <span>
              {gpu.vram_used_mb} / {gpu.vram_total_mb} MB ({vramPct}%)
            </span>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${vramPct}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between text-xs text-text-dim">
          <span>Utilization: {gpu.utilization_pct}%</span>
          <span>Temp: {gpu.temperature_c}°C</span>
        </div>
      </div>
    </div>
  );
}

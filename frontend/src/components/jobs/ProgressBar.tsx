interface Props {
  current: number;
  total: number;
  phase: string | null;
  status: string;
  speed: number | null;
  epoch: number;
  totalEpochs: number;
  saveEveryNEpochs: number;
  avrLoss?: number | null;
}

const PHASE_LABELS: Record<string, string> = {
  caching_latents: "Caching Latents",
  caching_text: "Caching Text Encoder",
  training: "Training",
  done: "Done",
};

export function ProgressBar({ current, total, phase, status, speed, epoch, totalEpochs, saveEveryNEpochs, avrLoss }: Props) {
  const pct = total > 0 ? Math.floor((current / total) * 100) : 0;
  const stepsPerEpoch = totalEpochs > 0 && total > 0 ? total / totalEpochs : 0;

  // Estimate time remaining
  const remaining = speed && total > current ? (total - current) * speed : null;
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="bg-surface-2 rounded-lg border border-border p-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">
          {phase ? PHASE_LABELS[phase] ?? phase : status.replace(/_/g, " ")}
          {epoch > 0 && totalEpochs > 0 && (
            <span className="text-text-dim font-normal ml-2">
              Epoch {epoch}/{totalEpochs}
            </span>
          )}
        </span>
        <span className="text-sm text-text-dim">
          {total > 0 ? `${current} / ${total} (${pct}%)` : current > 0 ? `${current} processed` : status}
        </span>
      </div>

      {/* Speed + ETA + Loss row */}
      {(speed != null && speed > 0 || avrLoss != null) && (
        <div className="flex justify-between items-center mb-2 text-xs text-text-dim">
          <span>
            {speed != null && speed > 0 && <>{speed.toFixed(1)}s/step</>}
            {avrLoss != null && (
              <span className="ml-3">avr_loss: {avrLoss.toFixed(4)}</span>
            )}
          </span>
          {remaining != null && <span>~{formatTime(remaining)} remaining</span>}
        </div>
      )}

      {/* Progress bar with epoch ticks */}
      <div className="relative h-2 bg-surface rounded-full overflow-hidden">
        {total > 0 ? (
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        ) : current > 0 ? (
          <div className="h-full w-1/3 bg-accent/60 rounded-full animate-pulse" />
        ) : (
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: "0%" }}
          />
        )}
        {/* Epoch tick marks — save epochs are highlighted */}
        {stepsPerEpoch > 0 && totalEpochs > 1 && (
          Array.from({ length: totalEpochs - 1 }, (_, i) => {
            const epochNum = i + 1;
            const tickPct = (epochNum * stepsPerEpoch / total) * 100;
            const isSave = saveEveryNEpochs > 0 && epochNum % saveEveryNEpochs === 0;
            return (
              <div
                key={i}
                className={`absolute top-0 w-px ${isSave ? "h-full bg-success/70" : "h-full bg-text-dim/20"}`}
                style={{ left: `${tickPct}%` }}
                title={`Epoch ${epochNum}${isSave ? " (save)" : ""}`}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

interface Props {
  current: number;
  total: number;
  phase: string | null;
  status: string;
}

const PHASE_LABELS: Record<string, string> = {
  caching_latents: "Caching Latents",
  caching_text: "Caching Text Encoder",
  training: "Training",
  done: "Done",
};

export function ProgressBar({ current, total, phase, status }: Props) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="bg-surface-2 rounded-lg border border-border p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">
          {phase ? PHASE_LABELS[phase] ?? phase : status.replace(/_/g, " ")}
        </span>
        <span className="text-sm text-text-dim">
          {total > 0 ? `${current} / ${total} (${pct}%)` : status}
        </span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

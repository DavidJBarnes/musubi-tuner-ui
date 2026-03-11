import type { SampleConfig } from "../../api/types";

interface Props {
  config: SampleConfig;
  onChange: (cfg: SampleConfig) => void;
}

const inputCls =
  "w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent";

export function SampleConfigForm({ config, onChange }: Props) {
  const set = <K extends keyof SampleConfig>(key: K, val: SampleConfig[K]) =>
    onChange({ ...config, [key]: val });

  return (
    <div className="bg-surface-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">Sample Generation</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
            className="accent-accent"
          />
          Enable
        </label>
      </div>

      {config.enabled && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-dim mb-1">Reference Image Path</label>
            <input
              className={inputCls}
              value={config.image_path}
              onChange={(e) => set("image_path", e.target.value)}
              placeholder="/path/to/reference_image.png"
            />
          </div>
          <div>
            <label className="block text-xs text-text-dim mb-1">Prompt</label>
            <textarea
              className={inputCls + " h-20 resize-y"}
              value={config.prompt}
              onChange={(e) => set("prompt", e.target.value)}
              placeholder="Describe the video to generate..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

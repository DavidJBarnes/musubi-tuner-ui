import type { DatasetConfig } from "../../api/types";

interface Props {
  config: DatasetConfig;
  onChange: (cfg: DatasetConfig) => void;
  datasetSelected: boolean;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-text-dim mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent";

export function DatasetTomlForm({ config, onChange, datasetSelected }: Props) {
  const set = <K extends keyof DatasetConfig>(key: K, val: DatasetConfig[K]) =>
    onChange({ ...config, [key]: val });

  return (
    <div className="bg-surface-2 rounded-lg border border-border p-4">
      <h3 className="font-medium text-sm mb-3">Dataset Config</h3>

      <div className="space-y-3">
        {!datasetSelected && (
          <>
            <Field label="Video Directory">
              <input className={inputCls} value={config.video_directory} onChange={(e) => set("video_directory", e.target.value)} />
            </Field>
            <Field label="Cache Directory">
              <input className={inputCls} value={config.cache_directory} onChange={(e) => set("cache_directory", e.target.value)} />
            </Field>
          </>
        )}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Num Repeats">
            <input type="number" className={inputCls} value={config.num_repeats} onChange={(e) => set("num_repeats", parseInt(e.target.value) || 1)} />
          </Field>
          <Field label="Width">
            <input
              type="number"
              className={inputCls}
              value={config.resolution[0]}
              onChange={(e) => set("resolution", [parseInt(e.target.value) || 0, config.resolution[1]])}
            />
          </Field>
          <Field label="Height">
            <input
              type="number"
              className={inputCls}
              value={config.resolution[1]}
              onChange={(e) => set("resolution", [config.resolution[0], parseInt(e.target.value) || 0])}
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Target Frames">
            <input
              type="number"
              className={inputCls}
              value={config.target_frames[0]}
              onChange={(e) => set("target_frames", [parseInt(e.target.value) || 61])}
            />
          </Field>
          <Field label="Frame Extraction">
            <select className={inputCls} value={config.frame_extraction} onChange={(e) => set("frame_extraction", e.target.value)}>
              <option value="full">full</option>
              <option value="head">head</option>
              <option value="chunk">chunk</option>
              <option value="slide">slide</option>
            </select>
          </Field>
          <Field label="Batch Size">
            <input type="number" className={inputCls} value={config.batch_size} onChange={(e) => set("batch_size", parseInt(e.target.value) || 1)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Caption Extension">
            <input className={inputCls} value={config.caption_extension} onChange={(e) => set("caption_extension", e.target.value)} />
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm pb-1.5">
              <input type="checkbox" checked={config.enable_bucket} onChange={(e) => set("enable_bucket", e.target.checked)} className="accent-accent" />
              Enable Bucket
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

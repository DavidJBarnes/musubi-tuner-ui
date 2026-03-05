import { useEffect, useState } from "react";
import useSWR from "swr";
import { api, fetcher } from "../../api/client";
import type { Settings } from "../../api/types";

const inputCls =
  "w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent";

export function SettingsPage() {
  const { data, mutate } = useSWR<Settings>("/settings", fetcher);
  const [form, setForm] = useState<Settings>({
    musubi_tuner_path: "",
    comfyui_models_path: "",
    default_output_dir: "",
    default_dataset_dir: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put("/settings", form);
      mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Settings</h2>
      <div className="max-w-xl bg-surface-2 rounded-lg border border-border p-6 space-y-4">
        <div>
          <label className="block text-xs text-text-dim mb-1">Musubi Tuner Path</label>
          <input
            className={inputCls}
            value={form.musubi_tuner_path}
            onChange={(e) => setForm({ ...form, musubi_tuner_path: e.target.value })}
            placeholder="/home/david/projects/lora-hardcut/musubi-tuner"
          />
          <p className="text-[10px] text-text-dim mt-1">Path to cloned musubi-tuner repository</p>
        </div>
        <div>
          <label className="block text-xs text-text-dim mb-1">ComfyUI Models Path</label>
          <input
            className={inputCls}
            value={form.comfyui_models_path}
            onChange={(e) => setForm({ ...form, comfyui_models_path: e.target.value })}
            placeholder="~/StabilityMatrix-linux-x64/Data/Packages/ComfyUI/models"
          />
          <p className="text-[10px] text-text-dim mt-1">Base models directory (DiT, VAE, T5)</p>
        </div>
        <div>
          <label className="block text-xs text-text-dim mb-1">Datasets Base Directory</label>
          <input
            className={inputCls}
            value={form.default_dataset_dir}
            onChange={(e) => setForm({ ...form, default_dataset_dir: e.target.value })}
            placeholder="/home/david/projects/lora-hardcut/dataset/videos"
          />
        </div>
        <div>
          <label className="block text-xs text-text-dim mb-1">Default Output Directory</label>
          <input
            className={inputCls}
            value={form.default_output_dir}
            onChange={(e) => setForm({ ...form, default_output_dir: e.target.value })}
            placeholder="/home/david/projects/lora-hardcut/output"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {saved && <span className="text-sm text-success">Saved!</span>}
        </div>
      </div>
    </div>
  );
}

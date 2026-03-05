import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { VideoInfo } from "../../api/types";

interface Props {
  video: VideoInfo;
  datasetName: string;
  onSaved: () => void;
}

export function CaptionEditor({ video, datasetName, onSaved }: Props) {
  const [caption, setCaption] = useState(video.caption);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCaption(video.caption);
  }, [video]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(
        `/datasets/${encodeURIComponent(datasetName)}/videos/${encodeURIComponent(video.name)}/caption`,
        { caption },
      );
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface-2 rounded-lg border border-border p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-sm">{video.filename}</h3>
      </div>
      <div className="mb-3 aspect-video bg-surface-3 rounded overflow-hidden">
        <img
          src={`/api/datasets/${encodeURIComponent(datasetName)}/videos/${encodeURIComponent(video.name)}/thumb`}
          alt={video.name}
          className="w-full h-full object-cover"
        />
      </div>
      <label className="block text-xs text-text-dim mb-1">Caption</label>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={4}
        className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text resize-y focus:outline-none focus:border-accent"
      />
      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-1.5 bg-accent text-white text-sm rounded hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Caption"}
        </button>
      </div>
    </div>
  );
}

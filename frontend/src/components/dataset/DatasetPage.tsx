import { useState } from "react";
import useSWR from "swr";
import { api, fetcher } from "../../api/client";
import type { VideoInfo } from "../../api/types";
import { CaptionEditor } from "./CaptionEditor";
import { UploadDropzone } from "./UploadDropzone";
import { VideoCard } from "./VideoCard";

export function DatasetPage() {
  const { data: videos, mutate } = useSWR<VideoInfo[]>("/datasets/videos", fetcher);
  const [selected, setSelected] = useState<string | null>(null);

  const selectedVideo = videos?.find((v) => v.name === selected);

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete ${name} and its caption?`)) return;
    await api.del(`/datasets/videos/${encodeURIComponent(name)}`);
    setSelected(null);
    mutate();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Dataset</h2>
        <span className="text-sm text-text-dim">{videos?.length ?? 0} videos</span>
      </div>

      <UploadDropzone onUploaded={() => mutate()} />

      <div className="grid grid-cols-12 gap-4 mt-4">
        <div className={selectedVideo ? "col-span-8" : "col-span-12"}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {videos?.map((v) => (
              <VideoCard
                key={v.name}
                video={v}
                selected={v.name === selected}
                onClick={() => setSelected(v.name === selected ? null : v.name)}
              />
            ))}
          </div>
          {videos?.length === 0 && (
            <p className="text-text-dim text-sm mt-4">
              No videos found. Upload videos or configure the dataset directory in Settings.
            </p>
          )}
        </div>

        {selectedVideo && (
          <div className="col-span-4">
            <CaptionEditor video={selectedVideo} onSaved={() => mutate()} />
            <button
              onClick={() => handleDelete(selectedVideo.name)}
              className="mt-2 w-full px-3 py-1.5 text-sm text-error border border-error/30 rounded hover:bg-error/10 transition-colors"
            >
              Delete Video
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

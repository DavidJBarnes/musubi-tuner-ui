import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import useSWR from "swr";
import { api, fetcher } from "../../api/client";
import type { VideoInfo } from "../../api/types";
import { CaptionEditor } from "./CaptionEditor";
import { UploadDropzone } from "./UploadDropzone";
import { VideoCard } from "./VideoCard";

export function DatasetDetailPage() {
  const { name } = useParams<{ name: string }>();
  const { data: videos, mutate } = useSWR<VideoInfo[]>(
    name ? `/datasets/${encodeURIComponent(name)}/videos` : null,
    fetcher,
  );
  const [selected, setSelected] = useState<string | null>(null);

  const selectedVideo = videos?.find((v) => v.name === selected);

  const handleDelete = async (videoName: string) => {
    if (!confirm(`Delete ${videoName} and its caption?`)) return;
    await api.del(`/datasets/${encodeURIComponent(name!)}/videos/${encodeURIComponent(videoName)}`);
    setSelected(null);
    mutate();
  };

  if (!name) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <Link to="/datasets" className="text-text-dim hover:text-text transition-colors text-sm">
            &larr; Datasets
          </Link>
          <h2 className="text-xl font-bold">{name}</h2>
        </div>
        <span className="text-sm text-text-dim">{videos?.length ?? 0} videos</span>
      </div>

      <UploadDropzone datasetName={name} onUploaded={() => mutate()} />

      <div className="grid grid-cols-12 gap-4 mt-4">
        <div className={selectedVideo ? "col-span-8" : "col-span-12"}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {videos?.map((v) => (
              <VideoCard
                key={v.name}
                video={v}
                datasetName={name}
                selected={v.name === selected}
                onClick={() => setSelected(v.name === selected ? null : v.name)}
              />
            ))}
          </div>
          {videos?.length === 0 && (
            <p className="text-text-dim text-sm mt-4">
              No videos found. Upload videos above.
            </p>
          )}
        </div>

        {selectedVideo && (
          <div className="col-span-4">
            <CaptionEditor video={selectedVideo} datasetName={name} onSaved={() => mutate()} />
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

import type { VideoInfo } from "../../api/types";

interface Props {
  video: VideoInfo;
  selected: boolean;
  onClick: () => void;
}

export function VideoCard({ video, selected, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg overflow-hidden border transition-colors ${
        selected ? "border-accent" : "border-border hover:border-accent/50"
      }`}
    >
      <div className="aspect-video bg-surface-3 relative">
        <img
          src={`/api/datasets/videos/${encodeURIComponent(video.name)}/thumb`}
          alt={video.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {!video.has_caption && (
          <div className="absolute top-1 right-1 bg-error/80 text-white text-[10px] px-1.5 py-0.5 rounded">
            No caption
          </div>
        )}
      </div>
      <div className="p-2 bg-surface-2">
        <p className="text-xs truncate" title={video.filename}>
          {video.filename}
        </p>
        <p className="text-[10px] text-text-dim">
          {(video.size_bytes / 1024 / 1024).toFixed(1)} MB
        </p>
      </div>
    </div>
  );
}

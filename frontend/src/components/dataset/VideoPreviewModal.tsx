import { useEffect } from "react";
import type { VideoInfo } from "../../api/types";
import { CaptionEditor } from "./CaptionEditor";

interface Props {
  video: VideoInfo;
  datasetName: string;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (name: string) => void;
}

export function VideoPreviewModal({ video, datasetName, onClose, onSaved, onDelete }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="modal-backdrop"
    >
      <div className="bg-surface rounded-lg border border-border shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-border shrink-0">
          <h3 className="font-medium">{video.filename}</h3>
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text transition-colors text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-4 p-4 min-h-0 overflow-y-auto">
          <div className="flex items-start justify-center md:w-1/2 shrink-0">
            <video
              controls
              autoPlay
              className="max-h-[70vh] max-w-full rounded bg-black"
              src={`/api/datasets/${encodeURIComponent(datasetName)}/videos/${encodeURIComponent(video.name)}/stream`}
            />
          </div>
          <div className="md:w-1/2 min-w-0">
            <CaptionEditor video={video} datasetName={datasetName} onSaved={onSaved} />
            <button
              onClick={() => onDelete(video.name)}
              className="mt-2 w-full px-3 py-1.5 text-sm text-error border border-error/30 rounded hover:bg-error/10 transition-colors"
            >
              Delete Video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

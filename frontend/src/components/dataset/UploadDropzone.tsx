import { useCallback, useRef, useState } from "react";

interface Props {
  datasetName: string;
  onUploaded: () => void;
}

export function UploadDropzone({ datasetName, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      const fd = new FormData();
      for (const f of files) {
        fd.append("files", f);
      }
      try {
        await fetch(`/api/datasets/${encodeURIComponent(datasetName)}/videos/upload`, { method: "POST", body: fd });
        onUploaded();
      } finally {
        setUploading(false);
      }
    },
    [datasetName, onUploaded],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        dragOver ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/*"
        className="hidden"
        onChange={(e) => e.target.files && upload(e.target.files)}
      />
      {uploading ? (
        <p className="text-sm text-text-dim">Uploading...</p>
      ) : (
        <p className="text-sm text-text-dim">
          Drop videos here or click to browse
        </p>
      )}
    </div>
  );
}

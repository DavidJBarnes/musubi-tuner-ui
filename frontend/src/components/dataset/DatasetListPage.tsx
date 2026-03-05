import { useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import { api, fetcher } from "../../api/client";
import type { DatasetInfo } from "../../api/types";

export function DatasetListPage() {
  const { data: datasets, mutate } = useSWR<DatasetInfo[]>("/datasets", fetcher);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post("/datasets", { name: newName.trim() });
      setNewName("");
      mutate();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Remove dataset "${name}" from list? (Files will not be deleted)`)) return;
    await api.del(`/datasets/${encodeURIComponent(name)}`);
    mutate();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Datasets</h2>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="new-dataset-name"
          className="bg-surface border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
        />
        <button
          onClick={create}
          disabled={creating || !newName.trim()}
          className="px-3 py-1.5 bg-accent text-white text-sm rounded hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {creating ? "Creating..." : "Create Dataset"}
        </button>
      </div>

      {datasets?.length === 0 && (
        <p className="text-text-dim text-sm">
          No datasets found. Create one above or add folders to the datasets base directory.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {datasets?.map((ds) => (
          <div key={ds.id} className="bg-surface-2 rounded-lg border border-border hover:border-accent/50 transition-colors">
            <Link
              to={`/datasets/${encodeURIComponent(ds.name)}`}
              className="block p-4"
            >
              <p className="font-medium text-sm">{ds.name}</p>
              <p className="text-xs text-text-dim mt-1">
                {ds.video_count} video{ds.video_count !== 1 ? "s" : ""}
              </p>
              <p className="text-[10px] text-text-dim mt-1">
                {new Date(ds.created_at).toLocaleDateString()}
              </p>
            </Link>
            <div className="border-t border-border px-4 py-2">
              <button
                onClick={() => handleDelete(ds.name)}
                className="text-[10px] text-text-dim hover:text-error transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UploadDropzone } from "./UploadDropzone";

const mockFetch = vi.fn().mockResolvedValue({ ok: true });

beforeEach(() => {
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UploadDropzone", () => {
  it("renders upload prompt", () => {
    render(<UploadDropzone datasetName="ds" onUploaded={vi.fn()} />);
    expect(screen.getByText("Drop videos here or click to browse")).toBeInTheDocument();
  });

  it("uploads files via file input and calls onUploaded", async () => {
    const onUploaded = vi.fn();
    render(<UploadDropzone datasetName="my-dataset" onUploaded={onUploaded} />);

    const file = new File(["video"], "test.mp4", { type: "video/mp4" });
    const input = document.querySelector("input[type='file']") as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/datasets/my-dataset/videos/upload",
      expect.objectContaining({ method: "POST" }),
    );
    expect(onUploaded).toHaveBeenCalled();
  });

  it("shows 'Uploading...' while upload is in progress", async () => {
    let resolveUpload!: () => void;
    mockFetch.mockReturnValue(new Promise((r) => { resolveUpload = () => r({ ok: true }); }));

    render(<UploadDropzone datasetName="ds" onUploaded={vi.fn()} />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["video"], "test.mp4", { type: "video/mp4" });

    await userEvent.upload(input, file);

    expect(screen.getByText("Uploading...")).toBeInTheDocument();
    resolveUpload();
  });
});

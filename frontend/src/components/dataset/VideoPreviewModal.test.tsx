// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VideoInfo } from "../../api/types";
import { VideoPreviewModal } from "./VideoPreviewModal";

vi.mock("./CaptionEditor", () => ({
  CaptionEditor: () => <div data-testid="caption-editor" />,
}));

const video: VideoInfo = {
  name: "clip_001",
  filename: "clip_001.mp4",
  caption: "A person walking",
  has_caption: true,
  size_bytes: 1024000,
};

function renderModal(overrides = {}) {
  const props = {
    video,
    datasetName: "test-dataset",
    onClose: vi.fn(),
    onSaved: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(<VideoPreviewModal {...props} />);
  return props;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("VideoPreviewModal", () => {
  it("renders video element with correct src", () => {
    renderModal();
    const videoEl = document.querySelector("video");
    expect(videoEl).toBeTruthy();
    expect(videoEl?.getAttribute("src")).toContain("/api/datasets/test-dataset/videos/clip_001/stream");
  });

  it("renders CaptionEditor", () => {
    renderModal();
    expect(screen.getByTestId("caption-editor")).toBeTruthy();
  });

  it("shows Delete Video button", () => {
    renderModal();
    expect(screen.getByText("Delete Video")).toBeTruthy();
  });

  it("calls onClose on backdrop click", () => {
    const props = renderModal();
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("calls onClose on Escape key", () => {
    const props = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onClose).toHaveBeenCalled();
  });

  it("calls onDelete when Delete Video is clicked", () => {
    const props = renderModal();
    fireEvent.click(screen.getByText("Delete Video"));
    expect(props.onDelete).toHaveBeenCalledWith("clip_001");
  });
});

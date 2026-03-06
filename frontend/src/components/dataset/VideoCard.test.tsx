import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeVideoInfo } from "../../test/factories";
import { VideoCard } from "./VideoCard";

describe("VideoCard", () => {
  it("renders filename", () => {
    render(<VideoCard video={makeVideoInfo()} datasetName="ds" selected={false} onClick={vi.fn()} />);
    expect(screen.getByText("clip001.mp4")).toBeInTheDocument();
  });

  it("renders thumbnail with correct src", () => {
    render(<VideoCard video={makeVideoInfo()} datasetName="my ds" selected={false} onClick={vi.fn()} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/api/datasets/my%20ds/videos/clip001/thumb");
  });

  it("shows file size in MB", () => {
    render(<VideoCard video={makeVideoInfo({ size_bytes: 10485760 })} datasetName="ds" selected={false} onClick={vi.fn()} />);
    expect(screen.getByText("10.0 MB")).toBeInTheDocument();
  });

  it("shows 'No caption' badge when has_caption is false", () => {
    render(<VideoCard video={makeVideoInfo({ has_caption: false })} datasetName="ds" selected={false} onClick={vi.fn()} />);
    expect(screen.getByText("No caption")).toBeInTheDocument();
  });

  it("hides caption badge when has_caption is true", () => {
    render(<VideoCard video={makeVideoInfo({ has_caption: true })} datasetName="ds" selected={false} onClick={vi.fn()} />);
    expect(screen.queryByText("No caption")).not.toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<VideoCard video={makeVideoInfo()} datasetName="ds" selected={false} onClick={onClick} />);
    await userEvent.click(screen.getByText("clip001.mp4"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

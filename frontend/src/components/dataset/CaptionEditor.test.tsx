import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeVideoInfo } from "../../test/factories";
import { CaptionEditor } from "./CaptionEditor";

vi.mock("../../api/client", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn().mockResolvedValue({}),
    post: vi.fn(),
    del: vi.fn(),
  },
}));

import { api } from "../../api/client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CaptionEditor", () => {
  it("shows the video filename", () => {
    render(<CaptionEditor video={makeVideoInfo()} datasetName="ds" onSaved={vi.fn()} />);
    expect(screen.getByText("clip001.mp4")).toBeInTheDocument();
  });

  it("renders textarea with existing caption", () => {
    render(<CaptionEditor video={makeVideoInfo({ caption: "A cat" })} datasetName="ds" onSaved={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("A cat");
  });

  it("calls api.put on save and triggers onSaved", async () => {
    const onSaved = vi.fn();
    render(<CaptionEditor video={makeVideoInfo({ name: "clip1", caption: "Hello" })} datasetName="my-ds" onSaved={onSaved} />);

    await userEvent.click(screen.getByText("Save Caption"));

    expect(api.put).toHaveBeenCalledWith(
      "/datasets/my-ds/videos/clip1/caption",
      { caption: "Hello" },
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("shows 'Saving...' while saving", async () => {
    let resolvePut!: () => void;
    vi.mocked(api.put).mockReturnValue(new Promise((r) => { resolvePut = () => r({}); }));

    render(<CaptionEditor video={makeVideoInfo()} datasetName="ds" onSaved={vi.fn()} />);
    await userEvent.click(screen.getByText("Save Caption"));

    expect(screen.getByText("Saving...")).toBeInTheDocument();
    resolvePut();
  });

  it("updates textarea when video prop changes", () => {
    const { rerender } = render(
      <CaptionEditor video={makeVideoInfo({ caption: "Old" })} datasetName="ds" onSaved={vi.fn()} />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("Old");

    rerender(<CaptionEditor video={makeVideoInfo({ caption: "New" })} datasetName="ds" onSaved={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("New");
  });
});

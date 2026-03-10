import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeVideoInfo } from "../../test/factories";
import { DatasetDetailPage } from "./DatasetDetailPage";

const mockMutate = vi.fn();
const mockUseSWR = vi.fn();

vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

vi.mock("../../api/client", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn().mockResolvedValue({}),
    post: vi.fn(),
    del: vi.fn().mockResolvedValue({}),
  },
  fetcher: vi.fn(),
}));


function renderPage(name = "test-dataset") {
  return render(
    <MemoryRouter initialEntries={[`/datasets/${name}`]}>
      <Routes>
        <Route path="/datasets/:name" element={<DatasetDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DatasetDetailPage", () => {
  it("renders dataset name", () => {
    mockUseSWR.mockReturnValue({ data: { items: [] }, mutate: mockMutate });
    renderPage("my-dataset");
    expect(screen.getByText("my-dataset")).toBeInTheDocument();
  });

  it("shows video count", () => {
    mockUseSWR.mockReturnValue({
      data: { items: [makeVideoInfo(), makeVideoInfo({ name: "clip2", filename: "clip2.mp4" })] },
      mutate: mockMutate,
    });
    renderPage();
    expect(screen.getByText("2 videos")).toBeInTheDocument();
  });

  it("shows empty state when no videos", () => {
    mockUseSWR.mockReturnValue({ data: { items: [] }, mutate: mockMutate });
    renderPage();
    expect(screen.getByText(/No videos found/)).toBeInTheDocument();
  });

  it("renders video cards", () => {
    mockUseSWR.mockReturnValue({
      data: { items: [makeVideoInfo({ filename: "hello.mp4" })] },
      mutate: mockMutate,
    });
    renderPage();
    expect(screen.getByText("hello.mp4")).toBeInTheDocument();
  });

  it("shows upload dropzone", () => {
    mockUseSWR.mockReturnValue({ data: { items: [] }, mutate: mockMutate });
    renderPage();
    expect(screen.getByText("Drop videos here or click to browse")).toBeInTheDocument();
  });

  it("opens video modal when a video is clicked", async () => {
    const video = makeVideoInfo({ name: "v1", filename: "v1.mp4", caption: "Test caption" });
    mockUseSWR.mockReturnValue({ data: { items: [video] }, mutate: mockMutate });
    renderPage();

    await userEvent.click(screen.getByText("v1.mp4"));

    // Modal should be open with video element and delete button
    expect(document.querySelector("video")).toBeInTheDocument();
    expect(screen.getByText("Delete Video")).toBeInTheDocument();
  });

  it("does not render a side panel", async () => {
    const video = makeVideoInfo({ name: "v1", filename: "v1.mp4" });
    mockUseSWR.mockReturnValue({ data: { items: [video] }, mutate: mockMutate });
    renderPage();

    await userEvent.click(screen.getByText("v1.mp4"));

    expect(document.querySelector(".col-span-4")).toBeNull();
    expect(document.querySelector(".col-span-8")).toBeNull();
  });

  it("has back link to datasets list", () => {
    mockUseSWR.mockReturnValue({ data: { items: [] }, mutate: mockMutate });
    renderPage();
    const backLink = screen.getByText("← Datasets");
    expect(backLink.closest("a")).toHaveAttribute("href", "/datasets");
  });
});

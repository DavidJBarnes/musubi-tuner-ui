import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Checkpoints } from "./Checkpoints";

const mockUseSWR = vi.fn();

vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Checkpoints", () => {
  it("shows empty state when no checkpoints", () => {
    mockUseSWR.mockReturnValue({ data: [] });
    render(<Checkpoints jobId="abc" />);
    expect(screen.getByText("No checkpoints yet")).toBeInTheDocument();
  });

  it("shows empty state when data is undefined", () => {
    mockUseSWR.mockReturnValue({ data: undefined });
    render(<Checkpoints jobId="abc" />);
    expect(screen.getByText("No checkpoints yet")).toBeInTheDocument();
  });

  it("renders checkpoint filenames", () => {
    mockUseSWR.mockReturnValue({
      data: [
        { filename: "epoch_2.safetensors", path: "/out/epoch_2.safetensors", size_bytes: 52428800, modified: 1709312400 },
        { filename: "epoch_4.safetensors", path: "/out/epoch_4.safetensors", size_bytes: 52428800, modified: 1709312500 },
      ],
    });
    render(<Checkpoints jobId="abc" />);
    expect(screen.getByText("epoch_2.safetensors")).toBeInTheDocument();
    expect(screen.getByText("epoch_4.safetensors")).toBeInTheDocument();
  });

  it("shows count badge", () => {
    mockUseSWR.mockReturnValue({
      data: [
        { filename: "ep1.safetensors", path: "", size_bytes: 1000, modified: 1709312400 },
      ],
    });
    render(<Checkpoints jobId="abc" />);
    expect(screen.getByText("1 saved")).toBeInTheDocument();
  });

  it("renders download links with correct href", () => {
    mockUseSWR.mockReturnValue({
      data: [{ filename: "model.safetensors", path: "", size_bytes: 1000000, modified: 1709312400 }],
    });
    render(<Checkpoints jobId="job-1" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/api/jobs/job-1/checkpoints/model.safetensors");
    expect(link).toHaveAttribute("download");
  });

  it("formats sizes correctly", () => {
    mockUseSWR.mockReturnValue({
      data: [
        { filename: "small.safetensors", path: "", size_bytes: 500000, modified: 1709312400 },
        { filename: "large.safetensors", path: "", size_bytes: 52428800, modified: 1709312400 },
      ],
    });
    render(<Checkpoints jobId="abc" />);
    expect(screen.getByText(/488 KB/)).toBeInTheDocument();
    expect(screen.getByText(/50\.0 MB/)).toBeInTheDocument();
  });
});

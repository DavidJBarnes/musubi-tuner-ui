import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogViewer } from "./LogViewer";

vi.mock("../../hooks/useSSE");

import { useSSE } from "../../hooks/useSSE";
const mockUseSSE = vi.mocked(useSSE);

beforeEach(() => {
  // jsdom doesn't implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LogViewer", () => {
  it("shows waiting message when no lines", () => {
    mockUseSSE.mockReturnValue({ lines: [], done: false, clear: vi.fn() });
    render(<LogViewer jobId="abc" />);
    expect(screen.getByText("Waiting for log output...")).toBeInTheDocument();
  });

  it("renders log lines", () => {
    mockUseSSE.mockReturnValue({ lines: ["Step 1/100", "Loss: 0.5"], done: false, clear: vi.fn() });
    render(<LogViewer jobId="abc" />);
    expect(screen.getByText("Step 1/100")).toBeInTheDocument();
    expect(screen.getByText("Loss: 0.5")).toBeInTheDocument();
  });

  it("shows 'Live' indicator when streaming", () => {
    mockUseSSE.mockReturnValue({ lines: ["something"], done: false, clear: vi.fn() });
    render(<LogViewer jobId="abc" />);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("shows 'Stream ended' when done", () => {
    mockUseSSE.mockReturnValue({ lines: ["final line"], done: true, clear: vi.fn() });
    render(<LogViewer jobId="abc" />);
    expect(screen.getByText("Stream ended")).toBeInTheDocument();
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
  });

  it("passes correct URL to useSSE", () => {
    mockUseSSE.mockReturnValue({ lines: [], done: false, clear: vi.fn() });
    render(<LogViewer jobId="job-42" />);
    expect(mockUseSSE).toHaveBeenCalledWith("/api/jobs/job-42/logs");
  });
});

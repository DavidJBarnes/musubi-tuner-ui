import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeJob } from "../../test/factories";
import { renderWithRouter } from "../../test/render";
import { DashboardPage } from "./DashboardPage";

vi.mock("../../hooks/useJobs");
vi.mock("../../hooks/useGpuStatus");

import { useJobs } from "../../hooks/useJobs";
import { useGpuStatus } from "../../hooks/useGpuStatus";

const mockUseJobs = vi.mocked(useJobs);
const mockUseGpuStatus = vi.mocked(useGpuStatus);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DashboardPage", () => {
  beforeEach(() => {
    mockUseGpuStatus.mockReturnValue({ gpu: undefined, error: undefined });
  });

  it("shows empty state when no jobs", () => {
    mockUseJobs.mockReturnValue({ jobs: [], error: undefined, mutate: vi.fn() });
    renderWithRouter(<DashboardPage />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText(/No jobs yet/)).toBeInTheDocument();
  });

  it("shows active jobs section", () => {
    mockUseJobs.mockReturnValue({
      jobs: [makeJob({ status: "training", name: "Running Job" })],
      error: undefined,
      mutate: vi.fn(),
    });
    renderWithRouter(<DashboardPage />);
    expect(screen.getByText("Active Jobs")).toBeInTheDocument();
    expect(screen.getByText("Running Job")).toBeInTheDocument();
  });

  it("shows queued jobs section", () => {
    mockUseJobs.mockReturnValue({
      jobs: [makeJob({ status: "queued", name: "Queued Job", queue_position: 1 })],
      error: undefined,
      mutate: vi.fn(),
    });
    renderWithRouter(<DashboardPage />);
    expect(screen.getByText(/Queue \(/)).toBeInTheDocument();
    expect(screen.getByText("Queued Job")).toBeInTheDocument();
  });

  it("shows recent jobs section for completed/failed jobs", () => {
    mockUseJobs.mockReturnValue({
      jobs: [makeJob({ status: "completed", name: "Done Job" })],
      error: undefined,
      mutate: vi.fn(),
    });
    renderWithRouter(<DashboardPage />);
    expect(screen.getByText("Recent Jobs")).toBeInTheDocument();
    expect(screen.getByText("Done Job")).toBeInTheDocument();
  });

  it("separates active, queued, and recent correctly", () => {
    mockUseJobs.mockReturnValue({
      jobs: [
        makeJob({ id: "1", status: "training", name: "Active" }),
        makeJob({ id: "2", status: "queued", name: "InQueue", queue_position: 1 }),
        makeJob({ id: "3", status: "completed", name: "Finished" }),
      ],
      error: undefined,
      mutate: vi.fn(),
    });
    renderWithRouter(<DashboardPage />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("InQueue")).toBeInTheDocument();
    expect(screen.getByText("Finished")).toBeInTheDocument();
  });
});

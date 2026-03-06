import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeJob } from "../../test/factories";
import { renderWithRouter } from "../../test/render";
import { JobsPage } from "./JobsPage";

vi.mock("../../hooks/useJobs");
vi.mock("../../api/client", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    del: vi.fn().mockResolvedValue({}),
  },
  fetcher: vi.fn(),
}));

import { useJobs } from "../../hooks/useJobs";
import { api } from "../../api/client";

const mockUseJobs = vi.mocked(useJobs);
const mockMutate = vi.fn();

afterEach(() => {
  vi.restoreAllMocks();
});

describe("JobsPage", () => {
  it("shows empty state", () => {
    mockUseJobs.mockReturnValue({ jobs: [], error: undefined, mutate: mockMutate });
    renderWithRouter(<JobsPage />);
    expect(screen.getByText("Jobs")).toBeInTheDocument();
    expect(screen.getByText(/No jobs yet/)).toBeInTheDocument();
  });

  it("shows New Job link", () => {
    mockUseJobs.mockReturnValue({ jobs: [], error: undefined, mutate: mockMutate });
    renderWithRouter(<JobsPage />);
    expect(screen.getByText("New Job")).toHaveAttribute("href", "/jobs/new");
  });

  it("shows running jobs section", () => {
    mockUseJobs.mockReturnValue({
      jobs: [makeJob({ status: "training", name: "Active Run" })],
      error: undefined,
      mutate: mockMutate,
    });
    renderWithRouter(<JobsPage />);
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Active Run")).toBeInTheDocument();
  });

  it("shows queue section with position", () => {
    mockUseJobs.mockReturnValue({
      jobs: [makeJob({ status: "queued", name: "Q Job", queue_position: 2 })],
      error: undefined,
      mutate: mockMutate,
    });
    renderWithRouter(<JobsPage />);
    expect(screen.getByText(/Queue/)).toBeInTheDocument();
    expect(screen.getByText("Q Job")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("shows history section", () => {
    mockUseJobs.mockReturnValue({
      jobs: [makeJob({ status: "completed", name: "Past Job" })],
      error: undefined,
      mutate: mockMutate,
    });
    renderWithRouter(<JobsPage />);
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Past Job")).toBeInTheDocument();
  });

  it("removes queued job on Remove click", async () => {
    mockUseJobs.mockReturnValue({
      jobs: [makeJob({ id: "q1", status: "queued", name: "Remove Me", queue_position: 1 })],
      error: undefined,
      mutate: mockMutate,
    });
    renderWithRouter(<JobsPage />);

    await userEvent.click(screen.getByText("Remove"));

    expect(api.del).toHaveBeenCalledWith("/jobs/q1");
    expect(mockMutate).toHaveBeenCalled();
  });
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeJobDetail } from "../../test/factories";
import { JobDetailPage } from "./JobDetail";

const mockMutate = vi.fn();
const mockUseSWR = vi.fn();

vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

vi.mock("../../hooks/useJobs", () => ({
  useJob: () => ({
    job: mockJobData,
    error: undefined,
    mutate: mockMutate,
  }),
}));

vi.mock("../../api/client", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn().mockResolvedValue({}),
    del: vi.fn().mockResolvedValue({}),
  },
  fetcher: vi.fn(),
}));

vi.mock("./LogViewer", () => ({
  LogViewer: () => <div data-testid="log-viewer">LogViewer</div>,
}));

vi.mock("./LossChart", () => ({
  LossChart: () => <div data-testid="loss-chart">LossChart</div>,
  computeTrendLine: () => [],
}));

vi.mock("./Checkpoints", () => ({
  Checkpoints: () => <div data-testid="checkpoints">Checkpoints</div>,
}));

let mockJobData: ReturnType<typeof makeJobDetail> | undefined = makeJobDetail();

function renderPage(jobId = "test-id") {
  return render(
    <MemoryRouter initialEntries={[`/jobs/${jobId}`]}>
      <Routes>
        <Route path="/jobs/:id" element={<JobDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  mockJobData = makeJobDetail();
});

describe("JobDetailPage", () => {
  beforeEach(() => {
    mockUseSWR.mockReturnValue({ data: null });
  });

  it("shows loading when job is undefined", () => {
    mockJobData = undefined;
    renderPage();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders job name and type", () => {
    mockJobData = makeJobDetail({ name: "My Training", job_type: "high_noise", status: "training" });
    renderPage();
    expect(screen.getByText("My Training")).toBeInTheDocument();
    expect(screen.getByText(/high noise/)).toBeInTheDocument();
  });

  it("shows Stop and Cancel buttons for running jobs", () => {
    mockJobData = makeJobDetail({ status: "training" });
    renderPage();
    expect(screen.getByText("Stop Job")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows Resume and Cancel for stopped jobs", () => {
    mockJobData = makeJobDetail({ status: "stopped" });
    renderPage();
    expect(screen.getByText("Resume Job")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows Resume and Retry for failed jobs", () => {
    mockJobData = makeJobDetail({ status: "failed" });
    renderPage();
    expect(screen.getByText("Resume Job")).toBeInTheDocument();
    expect(screen.getByText("Retry Job")).toBeInTheDocument();
  });

  it("shows Retry for cancelled jobs", () => {
    mockJobData = makeJobDetail({ status: "cancelled" });
    renderPage();
    expect(screen.getByText("Retry Job")).toBeInTheDocument();
  });

  it("shows Cancel Job for queued/pending", () => {
    mockJobData = makeJobDetail({ status: "queued" });
    renderPage();
    expect(screen.getByText("Cancel Job")).toBeInTheDocument();
  });

  it("shows error message when present", () => {
    mockJobData = makeJobDetail({ status: "failed", error_message: "OOM" });
    renderPage();
    expect(screen.getByText("OOM")).toBeInTheDocument();
  });

  it("shows timestamps", () => {
    mockJobData = makeJobDetail({
      created_at: "2026-03-01T12:00:00",
      started_at: "2026-03-01T12:01:00",
    });
    renderPage();
    expect(screen.getByText(/Created:/)).toBeInTheDocument();
    expect(screen.getByText(/Started:/)).toBeInTheDocument();
  });

  it("renders child components", () => {
    mockJobData = makeJobDetail({ status: "training" });
    renderPage();
    expect(screen.getByTestId("log-viewer")).toBeInTheDocument();
    expect(screen.getByTestId("checkpoints")).toBeInTheDocument();
    expect(screen.getByTestId("loss-chart")).toBeInTheDocument();
  });

  it("hides loss chart for non-training statuses", () => {
    mockJobData = makeJobDetail({ status: "caching_latents" });
    renderPage();
    expect(screen.queryByTestId("loss-chart")).not.toBeInTheDocument();
  });
});

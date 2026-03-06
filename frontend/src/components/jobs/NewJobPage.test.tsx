import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../test/render";
import { NewJobPage } from "./NewJobPage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("swr", () => ({
  default: (key: string | null) => {
    if (key === "/settings") return { data: undefined };
    if (key === "/datasets") return { data: { items: [] } };
    return { data: undefined };
  },
}));

vi.mock("../../hooks/useJobs", () => ({
  useJobs: () => ({ jobs: [], error: undefined, mutate: vi.fn() }),
}));

vi.mock("../../api/client", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn().mockResolvedValue({ id: "new-job", toml: "test", valid: true, errors: [] }),
    del: vi.fn(),
  },
  fetcher: vi.fn(),
}));

import { api } from "../../api/client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NewJobPage", () => {
  it("renders page heading", () => {
    renderWithRouter(<NewJobPage />);
    expect(screen.getByText("New Job")).toBeInTheDocument();
  });

  it("renders job type selector", () => {
    renderWithRouter(<NewJobPage />);
    expect(screen.getByDisplayValue("High Noise (900-1000)")).toBeInTheDocument();
  });

  it("shows Create & Start Job button when no running jobs", () => {
    renderWithRouter(<NewJobPage />);
    expect(screen.getByText("Create & Start Job")).toBeInTheDocument();
  });

  it("renders dataset config and training args forms", () => {
    renderWithRouter(<NewJobPage />);
    expect(screen.getByText("Dataset Config")).toBeInTheDocument();
    expect(screen.getByText("Training Args")).toBeInTheDocument();
  });

  it("shows Preview TOML and Validate buttons", () => {
    renderWithRouter(<NewJobPage />);
    expect(screen.getByText("Preview TOML")).toBeInTheDocument();
    expect(screen.getByText("Validate")).toBeInTheDocument();
  });

  it("creates job and navigates on submit", async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ valid: true, errors: [] })
      .mockResolvedValueOnce({ id: "created-job" });

    renderWithRouter(<NewJobPage />);

    await userEvent.click(screen.getByText("Create & Start Job"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/jobs/created-job");
    });
  });

  it("shows validation errors when validation fails", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ valid: false, errors: ["DiT path missing"] });

    renderWithRouter(<NewJobPage />);
    await userEvent.click(screen.getByText("Create & Start Job"));

    await waitFor(() => {
      expect(screen.getByText("DiT path missing")).toBeInTheDocument();
    });
  });

  it("switches job type", async () => {
    renderWithRouter(<NewJobPage />);
    const select = screen.getByDisplayValue("High Noise (900-1000)");
    await userEvent.selectOptions(select, "low_noise");
    expect(screen.getByDisplayValue("Low Noise (0-900)")).toBeInTheDocument();
  });
});

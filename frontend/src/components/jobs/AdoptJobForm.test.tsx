import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../test/render";
import { AdoptJobForm } from "./AdoptJobForm";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../api/client", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn().mockResolvedValue({ id: "new-job-id" }),
    del: vi.fn(),
  },
}));

import { api } from "../../api/client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AdoptJobForm", () => {
  it("renders form fields", () => {
    renderWithRouter(<AdoptJobForm onDone={vi.fn()} />);
    expect(screen.getByText("Adopt Existing Job")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/High Noise Run/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/separate\.log/)).toBeInTheDocument();
  });

  it("submits form and navigates to job", async () => {
    const onDone = vi.fn();
    renderWithRouter(<AdoptJobForm onDone={onDone} />);

    await userEvent.type(screen.getByPlaceholderText(/High Noise Run/), "My Job");
    await userEvent.type(screen.getByPlaceholderText(/separate\.log/), "/tmp/log");
    await userEvent.type(screen.getByPlaceholderText(/\/home\/david\/projects\/lora-hardcut\/logs$/), "/tmp/tb");

    await userEvent.click(screen.getByText("Adopt Job"));

    expect(api.post).toHaveBeenCalledWith("/jobs/adopt", expect.objectContaining({
      name: "My Job",
      log_file: "/tmp/log",
      tensorboard_dir: "/tmp/tb",
    }));
    expect(onDone).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/jobs/new-job-id");
  });

  it("shows error on API failure", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Server error"));
    renderWithRouter(<AdoptJobForm onDone={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText(/High Noise Run/), "Job");
    await userEvent.type(screen.getByPlaceholderText(/separate\.log/), "/tmp/log");
    await userEvent.type(screen.getByPlaceholderText(/\/home\/david\/projects\/lora-hardcut\/logs$/), "/tmp/tb");
    await userEvent.click(screen.getByText("Adopt Job"));

    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it("calls onDone when Cancel is clicked", async () => {
    const onDone = vi.fn();
    renderWithRouter(<AdoptJobForm onDone={onDone} />);
    await userEvent.click(screen.getByText("Cancel"));
    expect(onDone).toHaveBeenCalled();
  });
});

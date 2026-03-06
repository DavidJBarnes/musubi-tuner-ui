import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeDatasetInfo } from "../../test/factories";
import { renderWithRouter } from "../../test/render";
import { DatasetListPage } from "./DatasetListPage";

const mockMutate = vi.fn();
const mockUseSWR = vi.fn();

vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
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

import { api } from "../../api/client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DatasetListPage", () => {
  it("renders heading", () => {
    mockUseSWR.mockReturnValue({ data: undefined, mutate: mockMutate });
    renderWithRouter(<DatasetListPage />);
    expect(screen.getByText("Datasets")).toBeInTheDocument();
  });

  it("shows empty state when no datasets", () => {
    mockUseSWR.mockReturnValue({ data: { items: [] }, mutate: mockMutate });
    renderWithRouter(<DatasetListPage />);
    expect(screen.getByText(/No datasets found/)).toBeInTheDocument();
  });

  it("renders dataset cards", () => {
    mockUseSWR.mockReturnValue({
      data: {
        items: [
          makeDatasetInfo({ name: "hardcut", video_count: 238 }),
          makeDatasetInfo({ name: "test-ds", video_count: 5 }),
        ],
      },
      mutate: mockMutate,
    });
    renderWithRouter(<DatasetListPage />);
    expect(screen.getByText("hardcut")).toBeInTheDocument();
    expect(screen.getByText("238 videos")).toBeInTheDocument();
    expect(screen.getByText("test-ds")).toBeInTheDocument();
    expect(screen.getByText("5 videos")).toBeInTheDocument();
  });

  it("shows '1 video' (singular) for single video", () => {
    mockUseSWR.mockReturnValue({
      data: { items: [makeDatasetInfo({ video_count: 1 })] },
      mutate: mockMutate,
    });
    renderWithRouter(<DatasetListPage />);
    expect(screen.getByText("1 video")).toBeInTheDocument();
  });

  it("creates a dataset on button click", async () => {
    mockUseSWR.mockReturnValue({ data: { items: [] }, mutate: mockMutate });
    renderWithRouter(<DatasetListPage />);

    await userEvent.type(screen.getByPlaceholderText("new-dataset-name"), "new-ds");
    await userEvent.click(screen.getByText("Create Dataset"));

    expect(api.post).toHaveBeenCalledWith("/datasets", { name: "new-ds" });
    expect(mockMutate).toHaveBeenCalled();
  });

  it("deletes a dataset on Remove click", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockUseSWR.mockReturnValue({
      data: { items: [makeDatasetInfo({ name: "del-me" })] },
      mutate: mockMutate,
    });
    renderWithRouter(<DatasetListPage />);

    await userEvent.click(screen.getByText("Remove"));

    expect(api.del).toHaveBeenCalledWith("/datasets/del-me");
    expect(mockMutate).toHaveBeenCalled();
  });

  it("disables Create button when name is empty", () => {
    mockUseSWR.mockReturnValue({ data: { items: [] }, mutate: mockMutate });
    renderWithRouter(<DatasetListPage />);
    expect(screen.getByText("Create Dataset")).toBeDisabled();
  });
});

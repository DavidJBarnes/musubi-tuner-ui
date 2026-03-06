import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeSettings } from "../../test/factories";
import { SettingsPage } from "./SettingsPage";

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
    del: vi.fn(),
  },
  fetcher: vi.fn(),
}));

import { api } from "../../api/client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SettingsPage", () => {
  it("renders settings heading", () => {
    mockUseSWR.mockReturnValue({ data: undefined, mutate: mockMutate });
    render(<SettingsPage />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("populates form with loaded settings", () => {
    const settings = makeSettings({ musubi_tuner_path: "/my/path" });
    mockUseSWR.mockReturnValue({ data: settings, mutate: mockMutate });
    render(<SettingsPage />);
    expect(screen.getByDisplayValue("/my/path")).toBeInTheDocument();
  });

  it("calls api.put on save", async () => {
    mockUseSWR.mockReturnValue({ data: makeSettings(), mutate: mockMutate });
    render(<SettingsPage />);

    await userEvent.click(screen.getByText("Save Settings"));

    expect(api.put).toHaveBeenCalledWith("/settings", expect.objectContaining({
      musubi_tuner_path: "/home/user/musubi-tuner",
    }));
  });

  it("shows 'Saved!' after successful save", async () => {
    mockUseSWR.mockReturnValue({ data: makeSettings(), mutate: mockMutate });
    render(<SettingsPage />);

    await userEvent.click(screen.getByText("Save Settings"));

    await waitFor(() => {
      expect(screen.getByText("Saved!")).toBeInTheDocument();
    });
  });

  it("shows 'Saving...' while save is in progress", async () => {
    let resolvePut!: () => void;
    vi.mocked(api.put).mockReturnValue(new Promise((r) => { resolvePut = () => r({}); }));
    mockUseSWR.mockReturnValue({ data: makeSettings(), mutate: mockMutate });
    render(<SettingsPage />);

    await userEvent.click(screen.getByText("Save Settings"));
    expect(screen.getByText("Saving...")).toBeInTheDocument();

    resolvePut();
  });
});

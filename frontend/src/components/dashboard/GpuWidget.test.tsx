import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GpuWidget } from "./GpuWidget";

vi.mock("../../hooks/useGpuStatus");

import { useGpuStatus } from "../../hooks/useGpuStatus";
const mockUseGpuStatus = vi.mocked(useGpuStatus);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GpuWidget", () => {
  it("shows 'No GPU detected' when gpu is unavailable", () => {
    mockUseGpuStatus.mockReturnValue({ gpu: { name: "", vram_used_mb: 0, vram_total_mb: 0, utilization_pct: 0, temperature_c: 0, available: false }, error: undefined });
    render(<GpuWidget />);
    expect(screen.getByText("No GPU detected")).toBeInTheDocument();
  });

  it("shows 'No GPU detected' when gpu is undefined", () => {
    mockUseGpuStatus.mockReturnValue({ gpu: undefined, error: undefined });
    render(<GpuWidget />);
    expect(screen.getByText("No GPU detected")).toBeInTheDocument();
  });

  it("renders GPU name when available", () => {
    mockUseGpuStatus.mockReturnValue({
      gpu: { name: "RTX 3090", vram_used_mb: 8000, vram_total_mb: 24576, utilization_pct: 85, temperature_c: 72, available: true },
      error: undefined,
    });
    render(<GpuWidget />);
    expect(screen.getByText("RTX 3090")).toBeInTheDocument();
  });

  it("shows VRAM usage", () => {
    mockUseGpuStatus.mockReturnValue({
      gpu: { name: "RTX 3090", vram_used_mb: 8000, vram_total_mb: 24576, utilization_pct: 85, temperature_c: 72, available: true },
      error: undefined,
    });
    render(<GpuWidget />);
    expect(screen.getByText(/8000 \/ 24576 MB/)).toBeInTheDocument();
  });

  it("shows utilization and temperature", () => {
    mockUseGpuStatus.mockReturnValue({
      gpu: { name: "RTX 3090", vram_used_mb: 8000, vram_total_mb: 24576, utilization_pct: 85, temperature_c: 72, available: true },
      error: undefined,
    });
    render(<GpuWidget />);
    expect(screen.getByText("Utilization: 85%")).toBeInTheDocument();
    expect(screen.getByText("Temp: 72°C")).toBeInTheDocument();
  });
});

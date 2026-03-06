import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGpuStatus } from "./useGpuStatus";

const mockUseSWR = vi.fn();

vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

beforeEach(() => {
  mockUseSWR.mockReturnValue({ data: undefined, error: undefined });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useGpuStatus", () => {
  it("calls useSWR with /system/gpu and 3s refresh", () => {
    renderHook(() => useGpuStatus());
    expect(mockUseSWR).toHaveBeenCalledWith("/system/gpu", expect.any(Function), {
      refreshInterval: 3000,
    });
  });

  it("returns undefined gpu when no data", () => {
    const { result } = renderHook(() => useGpuStatus());
    expect(result.current.gpu).toBeUndefined();
  });

  it("returns gpu data when available", () => {
    const gpu = { name: "RTX 3090", available: true };
    mockUseSWR.mockReturnValue({ data: gpu, error: undefined });
    const { result } = renderHook(() => useGpuStatus());
    expect(result.current.gpu).toEqual(gpu);
  });

  it("passes through error", () => {
    const error = new Error("fail");
    mockUseSWR.mockReturnValue({ data: undefined, error });
    const { result } = renderHook(() => useGpuStatus());
    expect(result.current.error).toBe(error);
  });
});

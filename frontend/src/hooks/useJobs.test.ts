import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useJob, useJobs } from "./useJobs";

const mockUseSWR = vi.fn();

vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

beforeEach(() => {
  mockUseSWR.mockReturnValue({ data: undefined, error: undefined, mutate: vi.fn() });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useJobs", () => {
  it("calls useSWR with /jobs and 5s refresh", () => {
    renderHook(() => useJobs());
    expect(mockUseSWR).toHaveBeenCalledWith("/jobs", expect.any(Function), {
      refreshInterval: 5000,
    });
  });

  it("returns empty jobs array when data is undefined", () => {
    const { result } = renderHook(() => useJobs());
    expect(result.current.jobs).toEqual([]);
  });

  it("extracts items from paginated response", () => {
    const jobs = [{ id: "1", name: "Job 1" }];
    mockUseSWR.mockReturnValue({ data: { items: jobs }, error: undefined, mutate: vi.fn() });
    const { result } = renderHook(() => useJobs());
    expect(result.current.jobs).toEqual(jobs);
  });

  it("passes through error and mutate", () => {
    const error = new Error("fail");
    const mutate = vi.fn();
    mockUseSWR.mockReturnValue({ data: undefined, error, mutate });
    const { result } = renderHook(() => useJobs());
    expect(result.current.error).toBe(error);
    expect(result.current.mutate).toBe(mutate);
  });
});

describe("useJob", () => {
  it("calls useSWR with /jobs/:id and 3s refresh", () => {
    renderHook(() => useJob("abc"));
    expect(mockUseSWR).toHaveBeenCalledWith("/jobs/abc", expect.any(Function), {
      refreshInterval: 3000,
    });
  });

  it("passes null key when id is undefined", () => {
    renderHook(() => useJob(undefined));
    expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function), {
      refreshInterval: 3000,
    });
  });

  it("returns job data directly", () => {
    const job = { id: "abc", name: "Test" };
    mockUseSWR.mockReturnValue({ data: job, error: undefined, mutate: vi.fn() });
    const { result } = renderHook(() => useJob("abc"));
    expect(result.current.job).toEqual(job);
  });
});

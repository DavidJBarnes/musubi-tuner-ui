import useSWR from "swr";
import { fetcher } from "../api/client";
import type { GpuStats } from "../api/types";

export function useGpuStatus() {
  const { data, error } = useSWR<GpuStats>("/system/gpu", fetcher, {
    refreshInterval: 3000,
  });
  return { gpu: data, error };
}

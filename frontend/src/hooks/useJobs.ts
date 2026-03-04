import useSWR from "swr";
import { fetcher } from "../api/client";
import type { Job, JobDetail } from "../api/types";

export function useJobs() {
  const { data, error, mutate } = useSWR<Job[]>("/jobs", fetcher, {
    refreshInterval: 5000,
  });
  return { jobs: data ?? [], error, mutate };
}

export function useJob(id: string | undefined) {
  const { data, error, mutate } = useSWR<JobDetail>(
    id ? `/jobs/${id}` : null,
    fetcher,
    { refreshInterval: 3000 },
  );
  return { job: data, error, mutate };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createJob, fetchJobs, fetchJob, type JobInput } from "@/lib/api";

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
    refetchInterval: 5000,
  });
}

export function useJob(id: string | null) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: () => fetchJob(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "COMPLETED" || status === "FAILED") return false;
      return 2000;
    },
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: JobInput) => createJob(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

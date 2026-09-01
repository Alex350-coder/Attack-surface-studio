"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { reportSchema } from "./use-reports";

interface CreateReportInput {
  title: string;
  nodeIds: string[];
  edgeIds: string[];
}

export function useCreateReport(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReportInput) => {
      const data = await apiRequest<unknown>(`/projects/${projectId}/reports`, { method: "POST", body: input });
      return reportSchema.parse(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId, "reports"] });
    },
  });
}

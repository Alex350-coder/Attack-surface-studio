"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { reportSchema } from "./use-reports";

export function useReport(projectId: string, reportId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "reports", reportId] as const,
    queryFn: async () => {
      const data = await apiRequest<unknown>(`/projects/${projectId}/reports/${reportId}`);
      return reportSchema.parse(data);
    },
    enabled: projectId.length > 0 && reportId.length > 0,
  });
}

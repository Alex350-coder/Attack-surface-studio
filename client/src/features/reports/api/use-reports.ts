"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequestPaginated } from "@/lib/api-client";
import { nodeSchema, edgeSchema } from "@/lib/server-contracts";

/** Mirrors server/src/modules/knowledge/repositories/reports.repository.ts's ReportRow (FE-004). */
export const reportSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  status: z.string(),
  graphSnapshot: z.object({
    nodes: z.array(nodeSchema),
    edges: z.array(edgeSchema),
  }),
  contentRef: z.string().nullable(),
  generatedBy: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Report = z.infer<typeof reportSchema>;

const reportListSchema = z.array(reportSchema);

export function useReports(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "reports"] as const,
    queryFn: async () => {
      const { items } = await apiRequestPaginated<unknown[]>(`/projects/${projectId}/reports`);
      return reportListSchema.parse(items);
    },
    enabled: projectId.length > 0,
  });
}

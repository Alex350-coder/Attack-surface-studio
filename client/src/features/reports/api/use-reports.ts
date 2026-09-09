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
  status: z.enum(["draft", "generating", "ready", "failed"]),
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
      // Same fix as use-projects.ts (BUG #12): request the server's hard page-size cap since
      // the reports list has no pager UI, so anything past DEFAULT_PAGE_SIZE=25 would otherwise
      // silently vanish from view.
      const { items } = await apiRequestPaginated<unknown[]>(`/projects/${projectId}/reports?pageSize=100`);
      return reportListSchema.parse(items);
    },
    enabled: projectId.length > 0,
  });
}

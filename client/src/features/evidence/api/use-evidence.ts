"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequestPaginated } from "@/lib/api-client";

/** Mirrors server/src/modules/knowledge/repositories/evidence-files.repository.ts's EvidenceFileRow (FE-004). */
export const evidenceFileSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  nodeId: z.string().uuid().nullable(),
  fileRef: z.string(),
  contentHash: z.string(),
  mimeType: z.string(),
  label: z.string().nullable(),
  uploadedBy: z.string().nullable(),
  createdAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});
export type EvidenceFile = z.infer<typeof evidenceFileSchema>;

const evidenceFileListSchema = z.array(evidenceFileSchema);

export function useEvidence(projectId: string, nodeId?: string) {
  return useQuery({
    queryKey: ["projects", projectId, "evidence", { nodeId: nodeId ?? null }] as const,
    queryFn: async () => {
      // Same fix as use-projects.ts (BUG #12): request the server's hard page-size cap since
      // EvidenceGrid has no pager UI, so anything past DEFAULT_PAGE_SIZE=25 would otherwise
      // silently vanish from view.
      const path = nodeId
        ? `/projects/${projectId}/evidence?nodeId=${encodeURIComponent(nodeId)}&pageSize=100`
        : `/projects/${projectId}/evidence?pageSize=100`;
      const { items } = await apiRequestPaginated<unknown[]>(path);
      return evidenceFileListSchema.parse(items);
    },
    enabled: projectId.length > 0,
  });
}

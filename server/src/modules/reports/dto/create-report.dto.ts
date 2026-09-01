import { z } from "zod";

/** OWA-011 allow-list: only ids the caller selects from the already-fetched project graph. */
export const createReportSchema = z.object({
  title: z.string().trim().min(1).max(200),
  nodeIds: z.array(z.string().uuid()).max(500).default([]),
  edgeIds: z.array(z.string().uuid()).max(500).default([]),
});
export type CreateReportDto = z.infer<typeof createReportSchema>;

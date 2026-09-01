"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/api-client";

/** Mirrors server/src/modules/adapters/tool-config.service.ts's ToolListing (FE-004). */
export const toolListingSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  supportedModes: z.array(z.enum(["local", "docker"])),
});
export type ToolListing = z.infer<typeof toolListingSchema>;

const toolListingListSchema = z.array(toolListingSchema);

/** The tool registry is static and shared across every project -- no projectId scoping needed. */
export function useTools() {
  return useQuery({
    queryKey: ["tools"] as const,
    queryFn: async () => {
      const data = await apiRequest<unknown[]>("/tools");
      return toolListingListSchema.parse(data);
    },
  });
}

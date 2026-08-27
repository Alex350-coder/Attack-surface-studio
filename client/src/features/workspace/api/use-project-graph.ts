"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { nodeSchema, edgeSchema, type Node, type Edge } from "@/lib/server-contracts";
import type { GraphModel } from "@/modules/graph-engine";
import { toGraphModel } from "../graph/to-graph-model";

interface PaginatedShape<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Mirrors server/src/modules/projects/projects.service.ts's ProjectGraph -- two independently
 * paginated collections, not a single paginated shape, so the response envelope never lifts a
 * top-level `meta` for this endpoint (see transform-response.interceptor.ts's isPaginated). */
interface ProjectGraphResponse {
  nodes: PaginatedShape<Node>;
  edges: PaginatedShape<Edge>;
}

/**
 * Fetches a project's persisted graph, validates every node/edge with the shared Zod contracts
 * (FE-004) before it enters any state, and adapts it into the Graph Engine's GraphModel (FE-012).
 * Refetches on window focus so re-opening a project shows newly enriched data without a manual
 * reload.
 */
export function useProjectGraph(projectId: string) {
  return useQuery<GraphModel>({
    queryKey: ["projects", projectId, "graph"] as const,
    queryFn: async () => {
      const data = await apiRequest<ProjectGraphResponse>(`/projects/${projectId}/graph`);
      const nodes = data.nodes.items.map((node) => nodeSchema.parse(node));
      const edges = data.edges.items.map((edge) => edgeSchema.parse(edge));
      return toGraphModel(nodes, edges);
    },
    enabled: projectId.length > 0,
    refetchOnWindowFocus: true,
  });
}

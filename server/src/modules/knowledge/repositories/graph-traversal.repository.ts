import { sql } from "drizzle-orm";
import type { Database } from "../../../core/database/client";

/** Default and maximum traversal depth (DB-020, OWA-025) — no query may walk further than this. */
export const DEFAULT_TRAVERSAL_DEPTH = 3;
export const MAX_TRAVERSAL_DEPTH = 10;

export interface GraphTraversalRepository {
  /**
   * Returns every node id reachable from `rootNodeId` within `maxDepth` hops, scoped to
   * `projectId`. Wraps the canonical recursive CTE defined in DATA_MODEL.md §6 (DB-020).
   */
  getReachableNodeIds(projectId: string, rootNodeId: string, maxDepth?: number): Promise<string[]>;
}

export class DrizzleGraphTraversalRepository implements GraphTraversalRepository {
  constructor(private readonly db: Database) {}

  async getReachableNodeIds(
    projectId: string,
    rootNodeId: string,
    maxDepth: number = DEFAULT_TRAVERSAL_DEPTH,
  ): Promise<string[]> {
    const depth = Math.min(MAX_TRAVERSAL_DEPTH, Math.max(0, Math.floor(maxDepth)));

    const result = await this.db.execute<{ id: string }>(sql`
      WITH RECURSIVE reachable AS (
        SELECT n.id, 0 AS depth
        FROM nodes n
        WHERE n.id = ${rootNodeId} AND n.project_id = ${projectId} AND n.deleted_at IS NULL
        UNION ALL
        SELECT e.target_id, r.depth + 1
        FROM reachable r
        JOIN edges e ON e.source_id = r.id AND e.project_id = ${projectId} AND e.deleted_at IS NULL
        WHERE r.depth < ${depth}
      )
      SELECT DISTINCT id FROM reachable;
    `);

    return result.rows.map((row) => row.id);
  }
}

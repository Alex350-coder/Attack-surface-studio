import { sql } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import type { NodeRow } from "./nodes.repository";

export const DEFAULT_TRAVERSAL_DEPTH = 3;
export const MAX_TRAVERSAL_DEPTH = 10;
/** Assistant context is a prompt input, not a full graph dump -- capped independently of
 * `prompt-builder.service.ts`'s own cap so the query itself never pulls an unbounded row set. */
export const MAX_ASSISTANT_CONTEXT_NODES = 200;
export const MAX_UNSCANNED_TARGETS = 100;

/** camelCase column aliases so raw rows cast cleanly to `NodeRow`. */
const NODE_COLUMNS = sql`
  n.id, n.project_id AS "projectId", n.type, n.category, n.identity_key AS "identityKey",
  n.label, n.severity, n.data, n.source_run_id AS "sourceRunId", n.created_by AS "createdBy",
  n.created_at AS "createdAt", n.updated_at AS "updatedAt", n.last_seen_at AS "lastSeenAt",
  n.deleted_at AS "deletedAt"
`;

export interface GraphTraversalRepository {
  getReachableNodeIds(projectId: string, rootNodeId: string, maxDepth?: number): Promise<string[]>;
  /**
   * Bounded set of nodes to feed the AI Assistant's prompt (prompt-builder.service.ts). With a
   * `focusNodeId`, expands outward (either edge direction) up to `maxDepth`; without one, falls
   * back to the project's most recently seen nodes -- a general "what does this project look
   * like" overview.
   */
  getAssistantContextNodes(projectId: string, focusNodeId?: string, maxDepth?: number): Promise<NodeRow[]>;
  /** `criticalFinding` nodes connected (either edge direction) to a given asset node. */
  getCriticalFindingsForAsset(projectId: string, assetNodeId: string): Promise<NodeRow[]>;
  /** Infrastructure nodes (domain/subdomain/ip/host) with no outgoing `discovery` edge -- i.e.
   * nothing has been run against them yet. */
  getUnscannedTargets(projectId: string): Promise<NodeRow[]>;
}

export class DrizzleGraphTraversalRepository implements GraphTraversalRepository {
  constructor(private readonly db: Database) {}

  async getReachableNodeIds(projectId: string, rootNodeId: string, maxDepth = DEFAULT_TRAVERSAL_DEPTH): Promise<string[]> {
    const depth = Math.min(MAX_TRAVERSAL_DEPTH, Math.max(0, Math.floor(maxDepth)));
    const result = await this.db.execute<{ id: string }>(sql`
      WITH RECURSIVE reachable AS (
        SELECT n.id, 0 AS depth FROM nodes n
        WHERE n.id = ${rootNodeId} AND n.project_id = ${projectId} AND n.deleted_at IS NULL
        UNION ALL
        SELECT e.target_id, r.depth + 1 FROM reachable r
        JOIN edges e ON e.source_id = r.id AND e.project_id = ${projectId} AND e.deleted_at IS NULL
        WHERE r.depth < ${depth}
      )
      SELECT DISTINCT id FROM reachable;
    `);
    return result.rows.map((row) => row.id);
  }

  async getAssistantContextNodes(
    projectId: string,
    focusNodeId?: string,
    maxDepth = DEFAULT_TRAVERSAL_DEPTH,
  ): Promise<NodeRow[]> {
    const depth = Math.min(MAX_TRAVERSAL_DEPTH, Math.max(0, Math.floor(maxDepth)));

    if (!focusNodeId) {
      const result = await this.db.execute<Record<string, unknown>>(sql`
        SELECT ${NODE_COLUMNS} FROM nodes n
        WHERE n.project_id = ${projectId} AND n.deleted_at IS NULL
        ORDER BY n.last_seen_at DESC
        LIMIT ${MAX_ASSISTANT_CONTEXT_NODES};
      `);
      return result.rows as unknown as NodeRow[];
    }

    const result = await this.db.execute<Record<string, unknown>>(sql`
      WITH RECURSIVE reachable AS (
        SELECT n.id, 0 AS depth FROM nodes n
        WHERE n.id = ${focusNodeId} AND n.project_id = ${projectId} AND n.deleted_at IS NULL
        UNION ALL
        SELECT e.target_id, r.depth + 1 FROM reachable r
        JOIN edges e ON e.source_id = r.id AND e.project_id = ${projectId} AND e.deleted_at IS NULL
        WHERE r.depth < ${depth}
        UNION ALL
        SELECT e.source_id, r.depth + 1 FROM reachable r
        JOIN edges e ON e.target_id = r.id AND e.project_id = ${projectId} AND e.deleted_at IS NULL
        WHERE r.depth < ${depth}
      )
      SELECT DISTINCT ${NODE_COLUMNS} FROM nodes n
      JOIN reachable r ON r.id = n.id
      WHERE n.project_id = ${projectId} AND n.deleted_at IS NULL
      ORDER BY n.last_seen_at DESC
      LIMIT ${MAX_ASSISTANT_CONTEXT_NODES};
    `);
    return result.rows as unknown as NodeRow[];
  }

  async getCriticalFindingsForAsset(projectId: string, assetNodeId: string): Promise<NodeRow[]> {
    const result = await this.db.execute<Record<string, unknown>>(sql`
      SELECT DISTINCT ${NODE_COLUMNS} FROM nodes n
      JOIN edges e ON (e.source_id = n.id OR e.target_id = n.id)
        AND e.project_id = ${projectId} AND e.deleted_at IS NULL
      WHERE n.project_id = ${projectId}
        AND n.deleted_at IS NULL
        AND n.type = 'criticalFinding'
        AND (e.source_id = ${assetNodeId} OR e.target_id = ${assetNodeId})
        AND n.id != ${assetNodeId};
    `);
    return result.rows as unknown as NodeRow[];
  }

  async getUnscannedTargets(projectId: string): Promise<NodeRow[]> {
    const result = await this.db.execute<Record<string, unknown>>(sql`
      SELECT ${NODE_COLUMNS} FROM nodes n
      WHERE n.project_id = ${projectId}
        AND n.deleted_at IS NULL
        AND n.type IN ('domain', 'subdomain', 'ip', 'host')
        AND NOT EXISTS (
          SELECT 1 FROM edges e
          WHERE e.project_id = ${projectId}
            AND e.source_id = n.id
            AND e.type = 'discovery'
            AND e.deleted_at IS NULL
        )
      ORDER BY n.last_seen_at ASC
      LIMIT ${MAX_UNSCANNED_TARGETS};
    `);
    return result.rows as unknown as NodeRow[];
  }
}

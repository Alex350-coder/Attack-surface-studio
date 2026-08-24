import { Inject, Injectable, Logger } from "@nestjs/common";
import type { AdapterEdge, AdapterNode, GraphDelta } from "../adapters/adapter.contract";
import { EDGES_REPOSITORY, NODES_REPOSITORY } from "./knowledge.tokens";
import type { EdgeRow, EdgesRepository, EdgeUpsertInput } from "./repositories/edges.repository";
import type { NodeRow, NodesRepository, NodeUpsertInput } from "./repositories/nodes.repository";

export interface ApplyDeltaContext {
  /** Stamped onto every upserted node/edge as their provenance (nullable for manual/user-authored graph objects). */
  sourceRunId?: string | null;
  createdBy?: string | null;
}

export interface ApplyDeltaResult {
  nodes: NodeRow[];
  edges: EdgeRow[];
}

/**
 * Turns a `GraphDelta` (identity keys, never UUIDs -- see adapter.contract.ts) into persisted
 * graph rows. This is the one place identity-key -> node-id resolution happens (INTEGRATION_SYSTEM.md,
 * Claude.md §9 "the normalization pipeline is the heart of the backend"). Reused by the
 * orchestrator worker (tool-run ingestion) and by every manual/uploaded-evidence entry point --
 * each of those is just a `GraphDelta` of size 1 going through the same code path.
 */
@Injectable()
export class GraphBuilderService {
  private readonly logger = new Logger(GraphBuilderService.name);

  constructor(
    @Inject(NODES_REPOSITORY) private readonly nodesRepository: NodesRepository,
    @Inject(EDGES_REPOSITORY) private readonly edgesRepository: EdgesRepository,
  ) {}

  async applyDelta(projectId: string, delta: GraphDelta, ctx: ApplyDeltaContext = {}): Promise<ApplyDeltaResult> {
    const nodeInputs: NodeUpsertInput[] = delta.nodes.map((node) => this.toNodeUpsertInput(node, ctx));
    const upsertedNodes = await this.nodesRepository.upsertMany(projectId, nodeInputs);

    const identityKeyToId = new Map<string, string>();
    for (const node of upsertedNodes) {
      identityKeyToId.set(node.identityKey, node.id);
    }

    const edgeInputs: EdgeUpsertInput[] = [];
    for (const edge of delta.edges) {
      const resolved = await this.resolveEdge(projectId, edge, identityKeyToId, ctx);
      if (resolved) edgeInputs.push(resolved);
    }

    const upsertedEdges = await this.edgesRepository.upsertMany(projectId, edgeInputs);
    return { nodes: upsertedNodes, edges: upsertedEdges };
  }

  private toNodeUpsertInput(node: AdapterNode, ctx: ApplyDeltaContext): NodeUpsertInput {
    return {
      identityKey: node.identityKey,
      type: node.type,
      category: node.category,
      label: node.label,
      severity: node.severity ?? null,
      data: node.data,
      sourceRunId: ctx.sourceRunId ?? null,
      createdBy: ctx.createdBy ?? null,
    };
  }

  /**
   * Resolves an edge's identity-key endpoints to real node ids, first against this delta's own
   * upserted nodes, then (an edge may legitimately reference a node discovered by an earlier
   * run) against the project's existing nodes. An edge whose endpoint can never be resolved is
   * skipped -- logged, not thrown -- so one bad edge can never fail the rest of the ingestion.
   */
  private async resolveEdge(
    projectId: string,
    edge: AdapterEdge,
    identityKeyToId: Map<string, string>,
    ctx: ApplyDeltaContext,
  ): Promise<EdgeUpsertInput | null> {
    const sourceId = await this.resolveIdentityKey(projectId, edge.sourceIdentityKey, identityKeyToId);
    const targetId = await this.resolveIdentityKey(projectId, edge.targetIdentityKey, identityKeyToId);

    if (!sourceId || !targetId) {
      this.logger.warn(
        `Skipping edge (type=${edge.type}): unresolved identity key(s) ` +
          `[source=${edge.sourceIdentityKey}${sourceId ? "" : " UNRESOLVED"}, ` +
          `target=${edge.targetIdentityKey}${targetId ? "" : " UNRESOLVED"}] in project ${projectId}`,
      );
      return null;
    }

    return {
      sourceId,
      targetId,
      type: edge.type,
      animated: edge.animated,
      label: edge.label,
      data: edge.data,
      sourceRunId: ctx.sourceRunId ?? null,
    };
  }

  private async resolveIdentityKey(
    projectId: string,
    identityKey: string,
    identityKeyToId: Map<string, string>,
  ): Promise<string | null> {
    const cached = identityKeyToId.get(identityKey);
    if (cached) return cached;

    const existing = await this.nodesRepository.findByIdentityKey(projectId, identityKey);
    if (existing) {
      identityKeyToId.set(identityKey, existing.id);
      return existing.id;
    }
    return null;
  }
}

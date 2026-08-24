import { Inject, Injectable } from "@nestjs/common";
import { GRAPH_BUILDER, EDGES_REPOSITORY } from "./knowledge.tokens";
import type { GraphBuilderService } from "./graph-builder.service";
import type { EdgeRow, EdgesRepository } from "./repositories/edges.repository";
import type { NodeRow } from "./repositories/nodes.repository";
import type { ManualNodeDto } from "./dto/manual-node.dto";
import type { ManualEdgeDto } from "./dto/manual-edge.dto";

/**
 * Manual/user-authored contributions to the graph. Each is conceptually "a GraphDelta of size
 * one" and reuses the same GraphBuilderService persistence path a tool run's delta goes through
 * (Claude.md §9 -- one normalization pipeline, not a parallel one for manual entry).
 */
@Injectable()
export class KnowledgeService {
  constructor(
    @Inject(GRAPH_BUILDER) private readonly graphBuilder: GraphBuilderService,
    @Inject(EDGES_REPOSITORY) private readonly edgesRepository: EdgesRepository,
  ) {}

  async addNode(projectId: string, actingUserId: string, dto: ManualNodeDto): Promise<NodeRow> {
    const { nodes } = await this.graphBuilder.applyDelta(
      projectId,
      { nodes: [dto], edges: [] },
      { sourceRunId: null, createdBy: actingUserId },
    );
    return nodes[0] as NodeRow;
  }

  /** Manual edges already reference real node UUIDs, so no identity-key resolution is needed. */
  async addEdge(projectId: string, dto: ManualEdgeDto): Promise<EdgeRow> {
    const [edge] = await this.edgesRepository.upsertMany(projectId, [{ ...dto, sourceRunId: null }]);
    return edge as EdgeRow;
  }
}

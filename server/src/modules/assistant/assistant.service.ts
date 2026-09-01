import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { NotFoundError } from "../../core/http/domain-error";
import { LLM_PROVIDER, LlmProviderUnavailableError, type LlmProvider } from "../../core/ai/llm-provider.contract";
import { EDGES_REPOSITORY, GRAPH_TRAVERSAL_REPOSITORY, NODES_REPOSITORY } from "../knowledge/knowledge.tokens";
import type { EdgeRow, EdgesRepository } from "../knowledge/repositories/edges.repository";
import type { NodeRow, NodesRepository } from "../knowledge/repositories/nodes.repository";
import type { GraphTraversalRepository } from "../knowledge/repositories/graph-traversal.repository";
import { MAX_CONTEXT_EDGES, PromptBuilderService, type BuiltPrompt, type PromptContext } from "./prompt-builder.service";
import { AssistantProviderUnavailableError } from "./errors/assistant-provider-unavailable.error";
import type { AssistantQueryDto } from "./dto/assistant-query.dto";
import type { AssistantRecommendDto } from "./dto/assistant-recommend.dto";
import type { AssistantConfirmInsightDto } from "./dto/assistant-confirm-insight.dto";

export interface AssistantAnswer {
  answer: string;
  /** Node ids the graph context actually contained -- the model's response is not itself
   * parsed/validated here, but exposing this lets the client cross-check anything it renders as
   * clickable against ids that were genuinely in scope. */
  referencedNodeIds: string[];
  truncated: boolean;
}

export interface AssistantInsightResult {
  node: NodeRow;
  edges: EdgeRow[];
}

/**
 * Orchestrates the AI Assistant: fetch bounded graph context -> build an injection-safe prompt ->
 * call the configured LlmProvider -> (for confirmInsight) write the reviewed result back into the
 * graph via the manual-edge pathway (knowledge.service.ts's addNote/addEdge precedent). Has zero
 * dependency on the orchestrator/execution module -- there is no code path from a completion to
 * an executed action, regardless of prompt content (no-autonomous-execution).
 */
@Injectable()
export class AssistantService {
  constructor(
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
    @Inject(GRAPH_TRAVERSAL_REPOSITORY) private readonly graphTraversal: GraphTraversalRepository,
    @Inject(NODES_REPOSITORY) private readonly nodesRepository: NodesRepository,
    @Inject(EDGES_REPOSITORY) private readonly edgesRepository: EdgesRepository,
    private readonly promptBuilder: PromptBuilderService,
  ) {}

  async query(projectId: string, dto: AssistantQueryDto): Promise<AssistantAnswer> {
    this.assertConfigured();
    const context = await this.loadContext(projectId, dto.focusNodeId);
    const built = this.promptBuilder.buildQueryPrompt(dto.question, context);
    return this.complete(built);
  }

  async recommend(projectId: string, dto: AssistantRecommendDto): Promise<AssistantAnswer> {
    this.assertConfigured();
    const context = await this.loadContext(projectId, dto.focusNodeId);
    const built = this.promptBuilder.buildRecommendPrompt(context);
    return this.complete(built);
  }

  /**
   * Writes a user-confirmed insight as an `aiInsight` node plus `ai` edges to already-known node
   * ids. Every id is re-validated to exist in this project first (BOLA-style guard identical to
   * `ReportsService.createReport`) -- the assistant can never write an edge to a node it hasn't
   * independently confirmed belongs to this project.
   */
  async confirmInsight(
    projectId: string,
    actingUserId: string,
    dto: AssistantConfirmInsightDto,
  ): Promise<AssistantInsightResult> {
    const relatedNodes = await Promise.all(dto.relatedNodeIds.map((id) => this.nodesRepository.findById(projectId, id)));
    const missingIndex = relatedNodes.findIndex((node) => node === null);
    if (missingIndex !== -1) {
      throw new NotFoundError(`Node ${dto.relatedNodeIds[missingIndex]} was not found in this project`);
    }

    // Deterministic identity key: re-confirming the exact same content merges instead of
    // duplicating (DB-011/DB-012 idempotency), mirroring every other manual-write identity key.
    const contentHash = createHash("sha256").update(dto.content).digest("hex");
    const [node] = await this.nodesRepository.upsertMany(projectId, [
      {
        identityKey: `aiInsight:${contentHash}`,
        type: "aiInsight",
        category: "intelligence",
        label: dto.content.length > 60 ? `${dto.content.slice(0, 57)}...` : dto.content,
        data: { notes: [dto.content] },
        createdBy: actingUserId,
      },
    ]);
    const insightNode = node as NodeRow;

    const edges = await this.edgesRepository.upsertMany(
      projectId,
      dto.relatedNodeIds.map((targetId) => ({
        sourceId: insightNode.id,
        targetId,
        type: "ai",
        animated: true,
        sourceRunId: null,
      })),
    );

    return { node: insightNode, edges };
  }

  private assertConfigured(): void {
    if (!this.llmProvider.isConfigured()) {
      throw new AssistantProviderUnavailableError("The AI Assistant is not configured on this deployment");
    }
  }

  private async loadContext(projectId: string, focusNodeId?: string): Promise<PromptContext> {
    if (focusNodeId) {
      const focusNode = await this.nodesRepository.findById(projectId, focusNodeId);
      if (!focusNode) {
        throw new NotFoundError(`Node ${focusNodeId} was not found in this project`);
      }
    }

    const nodes = await this.graphTraversal.getAssistantContextNodes(projectId, focusNodeId);
    // Edges are fetched project-wide (bounded to the same page size the prompt builder caps at)
    // and then filtered down to the ones connecting two included context nodes -- see
    // PromptBuilderService.build(). This avoids a bespoke "edges among these node ids" repository
    // method for what is already a best-effort, size-capped context window.
    const { items: edges } = await this.edgesRepository.listByProject(projectId, {}, { page: 1, pageSize: MAX_CONTEXT_EDGES });

    return { nodes, edges };
  }

  private async complete(built: BuiltPrompt): Promise<AssistantAnswer> {
    try {
      const result = await this.llmProvider.complete({ messages: built.messages });
      return {
        answer: result.content,
        referencedNodeIds: [...built.includedNodeIds],
        truncated: built.truncated,
      };
    } catch (error) {
      if (error instanceof LlmProviderUnavailableError) {
        throw new AssistantProviderUnavailableError(error.message);
      }
      throw error;
    }
  }
}

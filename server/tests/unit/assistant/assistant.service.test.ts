import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantService } from "../../../src/modules/assistant/assistant.service";
import { AssistantProviderUnavailableError } from "../../../src/modules/assistant/errors/assistant-provider-unavailable.error";
import { PromptBuilderService } from "../../../src/modules/assistant/prompt-builder.service";
import { NotFoundError } from "../../../src/core/http/domain-error";
import { LlmProviderUnavailableError } from "../../../src/core/ai/llm-provider.contract";
import { FakeLlmProvider } from "./fakes/fake-llm-provider";
import type { NodeRow } from "../../../src/modules/knowledge/repositories/nodes.repository";
import type { EdgeRow } from "../../../src/modules/knowledge/repositories/edges.repository";

function makeNode(overrides: Partial<NodeRow> = {}): NodeRow {
  return {
    id: "n1",
    projectId: "p1",
    type: "host",
    category: "infrastructure",
    identityKey: "host:1",
    label: "example.com",
    severity: null,
    data: {},
    sourceRunId: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSeenAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("AssistantService", () => {
  let fakeLlm: FakeLlmProvider;
  let graphTraversal: { getAssistantContextNodes: ReturnType<typeof vi.fn> };
  let nodesRepository: { findById: ReturnType<typeof vi.fn>; upsertMany: ReturnType<typeof vi.fn> };
  let edgesRepository: { listByProject: ReturnType<typeof vi.fn>; upsertMany: ReturnType<typeof vi.fn> };
  let service: AssistantService;

  beforeEach(() => {
    fakeLlm = new FakeLlmProvider();
    graphTraversal = { getAssistantContextNodes: vi.fn().mockResolvedValue([makeNode()]) };
    nodesRepository = {
      findById: vi.fn().mockResolvedValue(makeNode()),
      upsertMany: vi.fn().mockResolvedValue([makeNode({ id: "insight-1", type: "aiInsight" })]),
    };
    edgesRepository = {
      listByProject: vi.fn().mockResolvedValue({ items: [] as EdgeRow[], page: 1, pageSize: 10, total: 0 }),
      upsertMany: vi.fn().mockResolvedValue([]),
    };

    service = new AssistantService(
      fakeLlm,
      graphTraversal as never,
      nodesRepository as never,
      edgesRepository as never,
      new PromptBuilderService(),
    );
  });

  describe("query", () => {
    it("throws AssistantProviderUnavailableError when the provider is unconfigured", async () => {
      fakeLlm.configured = false;
      await expect(service.query("p1", { question: "hi" })).rejects.toThrow(AssistantProviderUnavailableError);
    });

    it("returns the provider's completion plus the ids actually sent as context", async () => {
      fakeLlm.response = { content: "there are 3 hosts" };
      const result = await service.query("p1", { question: "how many hosts?" });

      expect(result.answer).toBe("there are 3 hosts");
      expect(result.referencedNodeIds).toEqual(["n1"]);
      expect(fakeLlm.lastRequest?.messages[1]?.content).toContain("how many hosts?");
    });

    it("404s when focusNodeId doesn't resolve to a node in this project", async () => {
      nodesRepository.findById.mockResolvedValue(null);
      await expect(service.query("p1", { question: "hi", focusNodeId: "missing" })).rejects.toThrow(NotFoundError);
    });

    it("maps a provider failure to AssistantProviderUnavailableError", async () => {
      fakeLlm.error = new LlmProviderUnavailableError("upstream down");
      await expect(service.query("p1", { question: "hi" })).rejects.toThrow(AssistantProviderUnavailableError);
    });
  });

  describe("recommend", () => {
    it("builds a recommend-style prompt and returns a completion", async () => {
      fakeLlm.response = { content: "scan example.com next" };
      const result = await service.recommend("p1", {});
      expect(result.answer).toBe("scan example.com next");
    });
  });

  describe("confirmInsight", () => {
    it("404s if any related node id doesn't belong to this project", async () => {
      nodesRepository.findById.mockResolvedValueOnce(makeNode()).mockResolvedValueOnce(null);
      await expect(
        service.confirmInsight("p1", "user-1", { content: "insight", relatedNodeIds: ["n1", "n2"] }),
      ).rejects.toThrow(NotFoundError);
      expect(nodesRepository.upsertMany).not.toHaveBeenCalled();
    });

    it("writes an aiInsight node and ai edges to every related node once all are validated", async () => {
      const result = await service.confirmInsight("p1", "user-1", {
        content: "example.com looks unscanned",
        relatedNodeIds: ["n1"],
      });

      expect(nodesRepository.upsertMany).toHaveBeenCalledWith(
        "p1",
        expect.arrayContaining([expect.objectContaining({ type: "aiInsight", category: "intelligence", createdBy: "user-1" })]),
      );
      expect(edgesRepository.upsertMany).toHaveBeenCalledWith(
        "p1",
        expect.arrayContaining([expect.objectContaining({ sourceId: "insight-1", targetId: "n1", type: "ai" })]),
      );
      expect(result.node.type).toBe("aiInsight");
    });
  });
});

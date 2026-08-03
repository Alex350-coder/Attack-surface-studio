import { describe, expect, it } from "vitest";
import { nodeCategorySchema, nodeTypeSchema, nodeUpsertInputSchema } from "../../../src/contracts/node.schema";

const ALL_NODE_TYPES = [
  "domain",
  "subdomain",
  "ip",
  "host",
  "port",
  "service",
  "technology",
  "os",
  "container",
  "cloud",
  "asset",
  "finding",
  "criticalFinding",
  "evidence",
  "screenshot",
  "request",
  "response",
  "report",
  "note",
  "aiInsight",
];

describe("node contracts", () => {
  it("accepts every one of the canonical 20 node types", () => {
    for (const type of ALL_NODE_TYPES) {
      expect(() => nodeTypeSchema.parse(type)).not.toThrow();
    }
  });

  it("accepts every canonical node category", () => {
    for (const category of ["infrastructure", "security", "artifact", "intelligence"]) {
      expect(() => nodeCategorySchema.parse(category)).not.toThrow();
    }
  });

  it("rejects an unknown node type", () => {
    expect(() => nodeTypeSchema.parse("not-a-real-type")).toThrow();
  });

  it("rejects an unknown node category", () => {
    expect(() => nodeCategorySchema.parse("not-a-real-category")).toThrow();
  });

  it("validates a well-formed upsert input", () => {
    const result = nodeUpsertInputSchema.safeParse({
      identityKey: "domain:acme.io",
      type: "domain",
      category: "infrastructure",
      label: "acme.io",
      data: { description: "root domain" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an upsert input with an invalid type", () => {
    const result = nodeUpsertInputSchema.safeParse({
      identityKey: "domain:acme.io",
      type: "not-a-real-type",
      category: "infrastructure",
      label: "acme.io",
    });
    expect(result.success).toBe(false);
  });
});

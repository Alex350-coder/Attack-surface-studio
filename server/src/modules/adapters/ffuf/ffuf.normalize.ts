import type { AdapterEdge, AdapterNode, GraphDelta, ParsedResult, RunContext } from "../adapter.contract";
import { assetIdentityKey, hostIdentityKey } from "../shared/identity-keys";
import type { FfufParsedOutput } from "./ffuf.parse";

/**
 * Maps ffuf's discovered paths onto the platform taxonomy (INTEGRATION_SYSTEM.md §6): each
 * result becomes an `asset` node connected to its `host` node by a `discovery` edge. Only the
 * URL/status/host survive normalization -- raw ffuf fields (words, lines, timing) don't cross
 * into the graph.
 */
export function normalizeFfufOutput(parsed: ParsedResult, _ctx: RunContext): Promise<GraphDelta> {
  const results = parsed as FfufParsedOutput;
  const nodes: AdapterNode[] = [];
  const edges: AdapterEdge[] = [];
  const seenHosts = new Set<string>();

  for (const result of results) {
    const hostKey = hostIdentityKey(result.host);
    if (!seenHosts.has(hostKey)) {
      seenHosts.add(hostKey);
      nodes.push({ identityKey: hostKey, type: "host", category: "infrastructure", label: result.host });
    }

    const assetKey = assetIdentityKey(result.url);
    nodes.push({
      identityKey: assetKey,
      type: "asset",
      category: "artifact",
      label: `${result.url} [${String(result.status)}]`,
    });
    edges.push({ sourceIdentityKey: hostKey, targetIdentityKey: assetKey, type: "discovery" });
  }

  return Promise.resolve({ nodes, edges });
}

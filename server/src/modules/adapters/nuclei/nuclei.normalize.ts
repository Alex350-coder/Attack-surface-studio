import type { AdapterEdge, AdapterNode, GraphDelta, ParsedResult, RunContext } from "../adapter.contract";
import { findingIdentityKey, hostIdentityKey } from "../shared/identity-keys";
import { toPlatformSeverity } from "../shared/severity-map";
import type { NucleiParsedOutput } from "./nuclei.parse";

/**
 * Maps Nuclei's template matches onto the platform taxonomy (INTEGRATION_SYSTEM.md §6):
 * `finding`/`criticalFinding` nodes (severity-mapped via the shared severity map), connected to
 * the affected host by a `risk` edge. Only the template id/name/severity/host survive
 * normalization -- raw Nuclei fields (curl command, matcher internals, timestamps) don't cross
 * into the graph.
 */
export function normalizeNucleiOutput(parsed: ParsedResult, _ctx: RunContext): Promise<GraphDelta> {
  const matches = parsed as NucleiParsedOutput;
  const nodes: AdapterNode[] = [];
  const edges: AdapterEdge[] = [];
  const seenHosts = new Set<string>();

  for (const match of matches) {
    const hostKey = hostIdentityKey(match.host);
    if (!seenHosts.has(hostKey)) {
      seenHosts.add(hostKey);
      nodes.push({ identityKey: hostKey, type: "host", category: "infrastructure", label: match.host });
    }

    const severity = toPlatformSeverity(match.severity);
    const findingKey = findingIdentityKey(match.host, match.templateId);
    nodes.push({
      identityKey: findingKey,
      type: severity === "critical" ? "criticalFinding" : "finding",
      category: "security",
      label: match.name,
      severity,
    });
    edges.push({ sourceIdentityKey: hostKey, targetIdentityKey: findingKey, type: "risk" });
  }

  return Promise.resolve({ nodes, edges });
}

import type { AdapterEdge, AdapterNode, GraphDelta, ParsedResult, RunContext } from "../adapter.contract";
import { hostIdentityKey, ipIdentityKey, osIdentityKey, portIdentityKey, serviceIdentityKey } from "../shared/identity-keys";
import type { NmapParsedResult } from "./nmap.parse";

/**
 * Maps Nmap's parsed hosts/ports/services/OS guesses onto the platform taxonomy
 * (INTEGRATION_SYSTEM.md §6): `host`/`ip` nodes, `port`/`service` nodes, an `os` node when
 * detected, connected by `discovery`/`relationship` edges. Only meaning crosses into the graph --
 * no raw Nmap fields (reasons, timing, scan stats) leak through.
 */
export function normalizeNmapOutput(parsed: ParsedResult, _ctx: RunContext): Promise<GraphDelta> {
  const hosts = parsed as NmapParsedResult;
  const nodes: AdapterNode[] = [];
  const edges: AdapterEdge[] = [];

  for (const host of hosts) {
    if (host.status !== "up") continue;

    const ipKey = ipIdentityKey(host.address);
    const hostKey = hostIdentityKey(host.hostname ?? host.address);
    nodes.push({ identityKey: ipKey, type: "ip", category: "infrastructure", label: host.address });

    if (host.hostname) {
      nodes.push({ identityKey: hostKey, type: "host", category: "infrastructure", label: host.hostname });
      edges.push({ sourceIdentityKey: hostKey, targetIdentityKey: ipKey, type: "relationship", label: "resolves to" });
    }

    if (host.osGuess) {
      const osKey = osIdentityKey(host.hostname ?? host.address);
      nodes.push({ identityKey: osKey, type: "os", category: "infrastructure", label: host.osGuess });
      edges.push({ sourceIdentityKey: ipKey, targetIdentityKey: osKey, type: "relationship", label: "runs" });
    }

    for (const port of host.ports) {
      if (port.state !== "open") continue;

      const identityHost = host.hostname ?? host.address;
      const portKey = portIdentityKey(identityHost, port.port);
      nodes.push({
        identityKey: portKey,
        type: "port",
        category: "infrastructure",
        label: `${port.port}/${port.protocol}`,
      });
      edges.push({ sourceIdentityKey: ipKey, targetIdentityKey: portKey, type: "discovery" });

      if (port.serviceName) {
        const serviceKey = serviceIdentityKey(identityHost, port.port);
        const label = [port.serviceName, port.product, port.version].filter(Boolean).join(" ");
        nodes.push({ identityKey: serviceKey, type: "service", category: "infrastructure", label });
        edges.push({ sourceIdentityKey: portKey, targetIdentityKey: serviceKey, type: "relationship", label: "runs" });
      }
    }
  }

  return Promise.resolve({ nodes, edges });
}

import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { UnparseableOutputError, type ParsedResult, type RawOutputRef } from "../adapter.contract";

/**
 * `processEntities: false` is the primary XXE / entity-expansion defense (Rules.md `OWA-014`,
 * `Plan.md` "hardened parsers -- XML external entities disabled"): Nmap's XML output is untrusted
 * (`EXE-010`) and this parser never resolves or expands XML entities, internal or external.
 * Overall input size is already bounded upstream by the shared runner's `BoundedBuffer`
 * (5 MiB capture cap), which also limits algorithmic-complexity exposure here.
 */
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
  allowBooleanAttributes: true,
  isArray: (name) => ["host", "port", "hostname", "address", "osmatch"].includes(name),
});

const addressSchema = z.object({
  "@_addr": z.string().min(1),
  "@_addrtype": z.string().optional(),
});

const hostnameEntrySchema = z.object({
  "@_name": z.string().min(1),
  "@_type": z.string().optional(),
});

const serviceSchema = z.object({
  "@_name": z.string().optional(),
  "@_product": z.string().optional(),
  "@_version": z.string().optional(),
});

const portSchema = z.object({
  "@_protocol": z.string(),
  "@_portid": z.coerce.number().int().min(0).max(65535),
  state: z.object({ "@_state": z.string() }),
  service: serviceSchema.optional(),
});

const osMatchSchema = z.object({
  "@_name": z.string().min(1),
  "@_accuracy": z.coerce.number().optional(),
});

const hostSchema = z.object({
  status: z.object({ "@_state": z.string() }).optional(),
  address: z.array(addressSchema).min(1),
  hostnames: z.object({ hostname: z.array(hostnameEntrySchema) }).optional(),
  ports: z.object({ port: z.array(portSchema).optional() }).optional(),
  os: z.object({ osmatch: z.array(osMatchSchema).optional() }).optional(),
});

const nmapDocumentSchema = z.object({
  nmaprun: z.object({
    host: z.array(hostSchema).optional(),
  }),
});

export interface NmapParsedPort {
  protocol: string;
  port: number;
  state: string;
  serviceName?: string;
  product?: string;
  version?: string;
}

export interface NmapParsedHost {
  address: string;
  hostname?: string;
  status: string;
  ports: NmapParsedPort[];
  osGuess?: string;
}

export type NmapParsedResult = NmapParsedHost[];

/**
 * Turns Nmap's `-oX` XML output into a flat, adapter-internal structure. Throws
 * `UnparseableOutputError`. Must be `async` (not just Promise-returning) so the throws below are
 * rejected promises, matching the `ToolAdapter` contract.
 */
export async function parseNmapOutput(raw: RawOutputRef): Promise<ParsedResult> {
  let document: unknown;
  try {
    document = xmlParser.parse(raw.stdout);
  } catch (error) {
    throw new UnparseableOutputError(`Nmap output is not valid XML: ${(error as Error).message}`);
  }

  const result = nmapDocumentSchema.safeParse(document);
  if (!result.success) {
    throw new UnparseableOutputError(`Nmap XML did not match the expected -oX shape: ${result.error.message}`);
  }

  const hosts = result.data.nmaprun.host ?? [];
  const parsed: NmapParsedHost[] = hosts.map((host) => {
    const firstAddress = host.address[0];
    if (!firstAddress) {
      throw new UnparseableOutputError("Nmap host element has an empty address list");
    }
    const ipv4 = host.address.find((entry) => entry["@_addrtype"] === "ipv4") ?? firstAddress;
    const hostname = host.hostnames?.hostname[0]?.["@_name"];
    const ports = (host.ports?.port ?? []).map(
      (port): NmapParsedPort => ({
        protocol: port["@_protocol"],
        port: port["@_portid"],
        state: port.state["@_state"],
        serviceName: port.service?.["@_name"],
        product: port.service?.["@_product"],
        version: port.service?.["@_version"],
      }),
    );
    const bestOsGuess = host.os?.osmatch?.[0]?.["@_name"];

    return {
      address: ipv4["@_addr"],
      hostname,
      status: host.status?.["@_state"] ?? "unknown",
      ports,
      osGuess: bestOsGuess,
    };
  });

  return Promise.resolve(parsed);
}

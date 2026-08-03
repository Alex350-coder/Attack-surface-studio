import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/core/database/schema";
import { DrizzleUsersRepository } from "../src/modules/users/repositories/users.repository";
import { DrizzleProjectsRepository } from "../src/modules/projects/repositories/projects.repository";
import {
  DrizzleNodesRepository,
  type NodeUpsertInput,
} from "../src/modules/knowledge/repositories/nodes.repository";
import {
  DrizzleEdgesRepository,
  type EdgeUpsertInput,
} from "../src/modules/knowledge/repositories/edges.repository";

/**
 * Mirrors the frontend's "External Attack Surface" demo scenario
 * (client/src/data/demo-scenarios/external-attack-surface.ts) so local dev and manual
 * verification exercise a realistic, richly-connected graph (DATA_MODEL.md §7).
 *
 * Node/edge ids below (`d1`, `sd1`, `e1`, ...) match the frontend scenario's ids so the two
 * stay easy to diff by eye; they are never persisted — only used to wire up edges locally.
 */
const DEMO_NODES: Record<string, NodeUpsertInput> = {
  d1: {
    identityKey: "domain:acme-corp.io",
    type: "domain",
    category: "infrastructure",
    label: "acme-corp.io",
    data: {
      description: "Root domain discovered via certificate transparency logs.",
      properties: [
        { label: "Registrar", value: "Cloudflare" },
        { label: "Created", value: "2014-03-11" },
      ],
    },
  },
  sd1: {
    identityKey: "subdomain:app.acme-corp.io",
    type: "subdomain",
    category: "infrastructure",
    label: "app.acme-corp.io",
    data: { subtitle: "Web application" },
  },
  sd2: {
    identityKey: "subdomain:api.acme-corp.io",
    type: "subdomain",
    category: "infrastructure",
    label: "api.acme-corp.io",
    data: { subtitle: "REST API" },
  },
  sd3: {
    identityKey: "subdomain:staging.acme-corp.io",
    type: "subdomain",
    category: "infrastructure",
    label: "staging.acme-corp.io",
    data: { subtitle: "Pre-production" },
  },
  h1: {
    identityKey: "host:203.0.113.10",
    type: "host",
    category: "infrastructure",
    label: "203.0.113.10",
    data: { properties: [{ label: "ASN", value: "AS13335" }] },
  },
  h2: {
    identityKey: "host:203.0.113.22",
    type: "host",
    category: "infrastructure",
    label: "203.0.113.22",
    data: { properties: [{ label: "ASN", value: "AS13335" }] },
  },
  h3: {
    identityKey: "host:203.0.113.31",
    type: "host",
    category: "infrastructure",
    label: "203.0.113.31",
    data: { properties: [{ label: "ASN", value: "AS13335" }] },
  },
  p1: { identityKey: "port:203.0.113.10:443", type: "port", category: "infrastructure", label: "443/tcp" },
  p2: { identityKey: "port:203.0.113.22:22", type: "port", category: "infrastructure", label: "22/tcp" },
  p3: { identityKey: "port:203.0.113.31:8080", type: "port", category: "infrastructure", label: "8080/tcp" },
  sv1: { identityKey: "service:203.0.113.10:443:nginx", type: "service", category: "infrastructure", label: "nginx 1.25" },
  sv2: { identityKey: "service:203.0.113.22:22:openssh", type: "service", category: "infrastructure", label: "OpenSSH 8.9" },
  t1: { identityKey: "technology:app.acme-corp.io:react", type: "technology", category: "infrastructure", label: "React 18" },
  t2: { identityKey: "technology:api.acme-corp.io:node", type: "technology", category: "infrastructure", label: "Node.js 20" },
  f1: {
    identityKey: "finding:203.0.113.22:22:weak-cipher",
    type: "finding",
    category: "security",
    label: "Outdated TLS cipher suite",
    severity: "warning",
    data: {
      description: "SSH service still permits deprecated CBC ciphers.",
      findings: [
        {
          title: "Weak cipher negotiation",
          severity: "warning",
          description: "Server offers aes128-cbc alongside modern AEAD ciphers.",
        },
      ],
    },
  },
  cf1: {
    identityKey: "criticalFinding:staging.acme-corp.io:exposed-admin",
    type: "criticalFinding",
    category: "security",
    label: "Exposed admin panel",
    severity: "critical",
    data: {
      description: "Staging admin interface reachable without VPN restriction.",
      findings: [
        {
          title: "Unauthenticated admin route",
          severity: "critical",
          description: "/admin responds 200 without credentials on staging host.",
        },
      ],
    },
  },
  ev1: {
    identityKey: "evidence:staging.acme-corp.io:curl-headers",
    type: "evidence",
    category: "artifact",
    label: "curl response headers",
    data: {
      evidence: [{ title: "HTTP 200 OK", description: "Server: nginx, X-Powered-By: staging-admin-v2" }],
    },
  },
  r1: {
    identityKey: "report:acme-corp.io:external-asm",
    type: "report",
    category: "artifact",
    label: "External ASM Report",
    data: {
      notes: ["Generated automatically at scan completion."],
      timeline: [
        { label: "Scan started", timestamp: "00:00" },
        { label: "Critical finding flagged", timestamp: "00:11" },
      ],
    },
  },
};

const DEMO_EDGES: Array<Omit<EdgeUpsertInput, "sourceId" | "targetId"> & { source: string; target: string }> = [
  { source: "d1", target: "sd1", type: "discovery" },
  { source: "d1", target: "sd2", type: "discovery" },
  { source: "d1", target: "sd3", type: "discovery" },
  { source: "sd1", target: "h1", type: "discovery" },
  { source: "sd2", target: "h2", type: "discovery" },
  { source: "sd3", target: "h3", type: "discovery" },
  { source: "h1", target: "p1", type: "relationship" },
  { source: "h2", target: "p2", type: "relationship" },
  { source: "h3", target: "p3", type: "relationship" },
  { source: "p1", target: "sv1", type: "relationship" },
  { source: "p2", target: "sv2", type: "relationship" },
  { source: "h1", target: "t1", type: "relationship" },
  { source: "h2", target: "t2", type: "relationship" },
  { source: "sv2", target: "f1", type: "risk" },
  { source: "p3", target: "cf1", type: "risk", animated: true },
  { source: "cf1", target: "ev1", type: "evidence", animated: true },
  { source: "d1", target: "r1", type: "evidence" },
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required (see server/.env.example)");
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  const users = new DrizzleUsersRepository(db);
  const projectsRepo = new DrizzleProjectsRepository(db);
  const nodesRepo = new DrizzleNodesRepository(db);

  const owner =
    (await users.findByEmail("demo@attacksurfacestudio.dev")) ??
    (await users.create({ email: "demo@attacksurfacestudio.dev", passwordHash: "seed-placeholder" }));

  const project =
    (await projectsRepo.findBySlug("external-attack-surface")) ??
    (await projectsRepo.create({
      name: "External Attack Surface",
      slug: "external-attack-surface",
      scope: { includes: ["acme-corp.io"], excludes: [] },
      createdBy: owner.id,
    }));

  // Everything below runs as one unit: partial seed data left behind by a mid-run failure
  // would corrupt the demo graph (BE-021).
  const { nodeIdByLocalKey, edgeCount } = await db.transaction(async (tx) => {
    const txNodesRepo = new DrizzleNodesRepository(tx);
    const txEdgesRepo = new DrizzleEdgesRepository(tx);

    const localKeys = Object.keys(DEMO_NODES);
    const upsertedNodes = await txNodesRepo.upsertMany(project.id, localKeys.map((key) => DEMO_NODES[key]!));

    const nodeIdByLocalKey = new Map<string, string>();
    localKeys.forEach((key, index) => {
      const identityKey = DEMO_NODES[key]!.identityKey;
      const row = upsertedNodes.find((node) => node.identityKey === identityKey);
      if (!row) throw new Error(`Failed to seed node ${key} (${identityKey})`);
      nodeIdByLocalKey.set(key, row.id);
      void index;
    });

    const edgeInputs: EdgeUpsertInput[] = DEMO_EDGES.map(({ source, target, ...rest }) => {
      const sourceId = nodeIdByLocalKey.get(source);
      const targetId = nodeIdByLocalKey.get(target);
      if (!sourceId || !targetId) throw new Error(`Unknown edge endpoint ${source} -> ${target}`);
      return { ...rest, sourceId, targetId };
    });
    const upsertedEdges = await txEdgesRepo.upsertMany(project.id, edgeInputs);

    return { nodeIdByLocalKey, edgeCount: upsertedEdges.length };
  });

  const nodesRow = await nodesRepo.listByProject(project.id, {}, { pageSize: 100 });

  console.log(
    `Seeded project "${project.name}" (${project.id}) with ${nodesRow.total} nodes and ${edgeCount} edges.`,
  );
  void nodeIdByLocalKey;

  await pool.end();
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});

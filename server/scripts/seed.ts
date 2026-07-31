import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { projects, users, nodes, edges } from "../src/core/database/schema/index";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required (see server/.env.example)");
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  const [owner] = await db
    .insert(users)
    .values({ email: "demo@attacksurfacestudio.dev", passwordHash: "seed-placeholder" })
    .returning();
  if (!owner) throw new Error("Failed to seed user");

  const [project] = await db
    .insert(projects)
    .values({ name: "Demo Project", slug: "demo-project", createdBy: owner.id })
    .returning();
  if (!project) throw new Error("Failed to seed project");

  const [domainNode] = await db
    .insert(nodes)
    .values({
      projectId: project.id,
      type: "domain",
      category: "infrastructure",
      identityKey: "domain:example.com",
      label: "example.com",
    })
    .returning();
  if (!domainNode) throw new Error("Failed to seed domain node");

  const [ipNode] = await db
    .insert(nodes)
    .values({
      projectId: project.id,
      type: "ip",
      category: "infrastructure",
      identityKey: "ip:93.184.216.34",
      label: "93.184.216.34",
    })
    .returning();
  if (!ipNode) throw new Error("Failed to seed ip node");

  await db.insert(edges).values({
    projectId: project.id,
    sourceId: domainNode.id,
    targetId: ipNode.id,
    type: "discovery",
  });

  console.log(`Seeded project ${project.id} with nodes ${domainNode.id}, ${ipNode.id}.`);

  await pool.end();
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});

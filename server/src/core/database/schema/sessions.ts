import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Server-side revocable refresh-token sessions (SEC-004). Only a SHA-256 digest of the refresh
 * token is stored -- not Argon2id, since the token itself is already a 256-bit CSPRNG value, not
 * a user-chosen secret. The raw token exists only in the client's hands. `replacedBySessionId` chains
 * a rotation lineage so a replayed (already-rotated) refresh token can be detected and the whole
 * chain revoked (SEC-004, OWA-020).
 */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  replacedBySessionId: uuid("replaced_by_session_id"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

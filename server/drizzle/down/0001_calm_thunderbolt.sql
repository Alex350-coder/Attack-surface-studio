-- Down migration for 0001_calm_thunderbolt.sql
-- Hand-authored: drizzle-kit does not generate down migrations natively
-- (see ARCHITECTURE.md ADR "Hand-authored down migrations").
DROP TABLE IF EXISTS "sessions" CASCADE;

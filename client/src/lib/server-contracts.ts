/**
 * Re-exports the backend's canonical Node/Edge Zod contracts (server/src/contracts) so product
 * surfaces can typecheck against the same wire/domain shapes the API returns. This is a real
 * consumer, not a throwaway stub — the Phase 9 Workspace data-adapter reconciles these DTOs with
 * the Graph Engine's own internal rendering types (graph-engine/types), which stay closed and
 * unmodified.
 */
export * from "@attack-surface-studio/server/src/contracts";

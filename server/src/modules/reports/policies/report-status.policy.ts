export type ReportStatus = "draft" | "generating" | "ready" | "failed";

/**
 * Explicit allow-list of valid report status transitions (OWA-021). Every export request goes
 * through `generating` so concurrent export attempts collide on the same atomic conditional
 * update (OWA-020) instead of racing to write `ready`/`failed` independently.
 */
const ALLOWED_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  draft: ["generating"],
  generating: ["ready", "failed"],
  ready: ["generating"],
  failed: ["generating"],
};

export function canTransitionReportStatus(current: ReportStatus, next: ReportStatus): boolean {
  return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
}

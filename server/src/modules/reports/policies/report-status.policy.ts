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

const REPORT_STATUSES = Object.keys(ALLOWED_TRANSITIONS) as ReportStatus[];

/**
 * The set of statuses allowed to transition into `next`, derived from `ALLOWED_TRANSITIONS` so
 * callers (`ReportsService.exportReport`'s `transitionStatus` calls) never hardcode a `from`
 * list that could drift out of sync with the allow-list above.
 */
export function statesThatCanTransitionTo(next: ReportStatus): ReportStatus[] {
  return REPORT_STATUSES.filter((current) => canTransitionReportStatus(current, next));
}

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none",
  {
    variants: {
      tone: {
        neutral: "bg-[var(--color-surface-hover)] text-[var(--color-foreground-muted)]",
        pending: "bg-[var(--color-surface-hover)] text-[var(--color-foreground-muted)]",
        active: "bg-[var(--color-accent)]/15 text-[var(--color-accent)]",
        success: "bg-[var(--node-safe,#1a7f4b)]/15 text-[var(--node-safe,#1a7f4b)]",
        danger: "bg-[var(--node-critical)]/15 text-[var(--node-critical)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type Props = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

/** Status pill for run status (queued/running/succeeded/failed/cancelled) and report status (draft/ready). */
export function Badge({ className, tone, ...props }: Props) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const RUN_STATUS_TONES: Record<string, VariantProps<typeof badgeVariants>["tone"]> = {
  queued: "pending",
  running: "active",
  succeeded: "success",
  failed: "danger",
  cancelled: "neutral",
};

const REPORT_STATUS_TONES: Record<string, VariantProps<typeof badgeVariants>["tone"]> = {
  draft: "pending",
  generating: "active",
  ready: "success",
  failed: "danger",
};

export function runStatusTone(status: string): VariantProps<typeof badgeVariants>["tone"] {
  return RUN_STATUS_TONES[status] ?? "neutral";
}

export function reportStatusTone(status: string): VariantProps<typeof badgeVariants>["tone"] {
  return REPORT_STATUS_TONES[status] ?? "neutral";
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
};

const SECTIONS = [
  { segment: "", label: "Graph" },
  { segment: "tools", label: "Runs" },
  { segment: "evidence", label: "Evidence" },
  { segment: "reports", label: "Reports" },
  { segment: "timeline", label: "Timeline" },
  { segment: "assistant", label: "Assistant" },
  { segment: "settings", label: "Settings" },
] as const;

/**
 * Routes, not a single page's panels, so this can't be `<Tabs>` itself (that primitive controls
 * visibility of children sharing one page's state). It reuses the same `role="tablist"` visual
 * language -- underline-on-active, muted-to-foreground hover -- so the seven project surfaces read
 * as one consistent navigation model regardless of which is backed by client state vs a route.
 */
export function ProjectSubNav({ projectId }: Props) {
  const pathname = usePathname();
  const basePath = `/app/projects/${projectId}`;

  return (
    <nav aria-label="Project sections" role="tablist" className="flex gap-1 border-b border-[var(--color-border)]">
      {SECTIONS.map((section) => {
        const href = section.segment ? `${basePath}/${section.segment}` : basePath;
        const isActive = pathname === href;
        return (
          <Link
            key={section.segment}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-[var(--color-accent)] text-[var(--color-foreground)]"
                : "border-transparent text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

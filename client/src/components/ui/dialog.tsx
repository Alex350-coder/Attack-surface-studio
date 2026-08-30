"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

/**
 * Extracted from `CreateProjectDialog`'s original portal+overlay+`role=dialog` shell so every new
 * dialog (evidence upload, add-member, report builder) shares one implementation instead of a
 * fourth copy-paste (react/patterns.md Portals guidance). `CreateProjectDialog` itself is left
 * untouched -- swapping it is unrelated churn in an already-tested file.
 */
export function Dialog({ title, description, onClose, children, className }: Props) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl",
          className,
        )}
      >
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">{description}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

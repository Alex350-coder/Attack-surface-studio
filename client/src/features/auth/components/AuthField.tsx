"use client";

import { cn } from "@/lib/utils";

type Props = {
  id: string;
  label: string;
  type: "email" | "password" | "text";
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  className?: string;
};

/** Shared text input styling for the auth forms -- reuses the design tokens, not a generic form template. */
export function AuthField({ id, label, type, value, onChange, autoComplete, className }: Props) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-foreground-muted)]">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm text-[var(--color-foreground)] outline-none transition-colors focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      />
    </div>
  );
}

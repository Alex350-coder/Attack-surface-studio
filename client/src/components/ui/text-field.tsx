"use client";

import { cn } from "@/lib/utils";

type Props = {
  id: string;
  label: string;
  type?: "email" | "password" | "text" | "number" | "url";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  autoComplete?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Generalizes `AuthField` for use outside auth (adapter option forms, evidence labels, report
 * titles, ...). Same token-driven styling, plus an optional inline error slot -- deliberately not
 * a refactor of `AuthField` itself to avoid unrelated churn in an already-tested file (FE rules).
 */
export function TextField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
  className,
  disabled,
}: Props) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-foreground-muted)]">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm text-[var(--color-foreground)] outline-none transition-colors focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-[var(--node-critical)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
